package kr.co.wdchub.sellerdata.service;

import kr.co.wdchub.sellerdata.domain.Banner;
import kr.co.wdchub.sellerdata.repository.BannerRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.*;

/**
 * 대시보드 슬라이드 배너 관리.
 * - 배너는 2개(super-flow=왼쪽, swiper-gl=오른쪽), 배너마다 이미지 최대 5장
 * - 이미지는 시놀로지가 아니라 이 앱 서버의 uploads/banners 폴더에 저장 (/uploads/banners/... 주소로 서빙)
 */
@Service
@RequiredArgsConstructor
public class BannerService {

    private static final Logger log = LoggerFactory.getLogger(BannerService.class);

    public static final String SLOT_SUPER_FLOW = "super-flow";
    public static final String SLOT_SWIPER_GL = "swiper-gl";
    public static final List<String> SLOTS = List.of(SLOT_SUPER_FLOW, SLOT_SWIPER_GL);

    public static final int MAX_PER_SLOT = 5;
    private static final long MAX_FILE_BYTES = 10L * 1024 * 1024; // 장당 10MB
    private static final List<String> ALLOWED_EXT = List.of("jpg", "jpeg", "png", "webp", "gif");

    /** 서버 기준 저장 폴더 (앱 실행 위치 기준 uploads/banners) */
    public static final Path BANNER_DIR = Path.of("uploads", "banners");

    private final BannerRepository bannerRepository;

    public record BannerResponse(Long id, String slotKey, String imageUrl, Integer sortOrder) {}

    // ── 조회 ──────────────────────────────────

    @Transactional(readOnly = true)
    public Map<String, List<BannerResponse>> listAll() {
        Map<String, List<BannerResponse>> result = new LinkedHashMap<>();
        for (String slot : SLOTS) {
            result.put(slot, bannerRepository.findAllBySlotKeyOrderBySortOrderAscIdAsc(slot).stream()
                    .map(this::toResponse)
                    .toList());
        }
        return result;
    }

    // ── 업로드 ────────────────────────────────

    @Transactional
    public List<BannerResponse> addImages(String slotKey, List<MultipartFile> files) {
        checkSlot(slotKey);

        List<MultipartFile> valid = files == null ? List.of()
                : files.stream().filter(f -> f != null && !f.isEmpty()).toList();

        if (valid.isEmpty()) {
            throw new IllegalArgumentException("업로드할 이미지를 선택해 주세요.");
        }
        if (valid.size() > MAX_PER_SLOT) {
            throw new IllegalArgumentException("한 번에 최대 " + MAX_PER_SLOT + "장까지 올릴 수 있어요.");
        }

        List<Banner> existing = bannerRepository.findAllBySlotKeyOrderBySortOrderAscIdAsc(slotKey);
        int remaining = MAX_PER_SLOT - existing.size();
        if (valid.size() > remaining) {
            throw new IllegalArgumentException(remaining <= 0
                    ? "이 배너는 이미 " + MAX_PER_SLOT + "장이 등록돼 있어요. 기존 이미지를 삭제한 뒤 올려 주세요."
                    : "이 배너에는 " + remaining + "장만 더 올릴 수 있어요. (최대 " + MAX_PER_SLOT + "장)");
        }

        valid.forEach(this::validate);

        int nextOrder = existing.stream().map(Banner::getSortOrder).max(Integer::compareTo).orElse(0) + 1;
        List<Path> savedFiles = new ArrayList<>();
        List<BannerResponse> added = new ArrayList<>();

        try {
            Files.createDirectories(BANNER_DIR);
            for (MultipartFile file : valid) {
                String fileName = UUID.randomUUID() + "." + extractExt(file.getOriginalFilename());
                Path target = BANNER_DIR.resolve(fileName);
                file.transferTo(target);
                savedFiles.add(target);

                Banner saved = bannerRepository.save(Banner.builder()
                        .slotKey(slotKey)
                        .imagePath("uploads/banners/" + fileName)
                        .sortOrder(nextOrder++)
                        .build());
                added.add(toResponse(saved));
            }
        } catch (IOException e) {
            deleteFilesQuietly(savedFiles);
            throw new IllegalStateException("배너 이미지를 저장하는 중 오류가 발생했습니다.", e);
        } catch (RuntimeException e) {
            deleteFilesQuietly(savedFiles);
            throw e;
        }
        return added;
    }

    // ── 삭제 ──────────────────────────────────

    @Transactional
    public void delete(Long id) {
        Banner banner = bannerRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 배너 이미지입니다. id=" + id));
        Path file = toLocalPath(banner.getImagePath());
        bannerRepository.delete(banner);

        // DB 삭제가 커밋된 뒤에 파일을 지웁니다 (롤백되면 파일은 그대로)
        runAfterCommit(() -> deleteFilesQuietly(file == null ? List.of() : List.of(file)));
    }

    // ── 순서 변경 ─────────────────────────────

    @Transactional
    public void reorder(String slotKey, List<Long> orderedIds) {
        checkSlot(slotKey);
        List<Banner> banners = bannerRepository.findAllBySlotKeyOrderBySortOrderAscIdAsc(slotKey);

        Set<Long> currentIds = new HashSet<>();
        banners.forEach(b -> currentIds.add(b.getId()));
        if (orderedIds == null || orderedIds.size() != banners.size() || !currentIds.equals(new HashSet<>(orderedIds))) {
            throw new IllegalArgumentException("순서를 바꿀 이미지 목록이 올바르지 않아요. 새로고침한 뒤 다시 시도해 주세요.");
        }

        Map<Long, Banner> byId = new HashMap<>();
        banners.forEach(b -> byId.put(b.getId(), b));
        int order = 1;
        for (Long id : orderedIds) {
            byId.get(id).setSortOrder(order++);
        }
    }

    // ── 내부 헬퍼 ─────────────────────────────

    private BannerResponse toResponse(Banner b) {
        String path = b.getImagePath();
        // 루트 기준 경로("/uploads/...")로 내려줍니다. 어떤 도메인/https에서 열어도 그대로 동작합니다.
        String url = (path.startsWith("http://") || path.startsWith("https://")) ? path
                : (path.startsWith("/") ? path : "/" + path);
        return new BannerResponse(b.getId(), b.getSlotKey(), url, b.getSortOrder());
    }

    private void checkSlot(String slotKey) {
        if (!SLOTS.contains(slotKey)) {
            throw new IllegalArgumentException("알 수 없는 배너입니다: " + slotKey);
        }
    }

    private void validate(MultipartFile file) {
        if (file.getSize() > MAX_FILE_BYTES) {
            throw new IllegalArgumentException("이미지는 장당 10MB 이하만 올릴 수 있어요: " + file.getOriginalFilename());
        }
        String ext = extractExt(file.getOriginalFilename());
        if (!ALLOWED_EXT.contains(ext)) {
            throw new IllegalArgumentException("jpg, png, webp, gif 이미지만 올릴 수 있어요: " + file.getOriginalFilename());
        }
    }

    private String extractExt(String filename) {
        if (filename == null || !filename.contains(".")) return "";
        return filename.substring(filename.lastIndexOf('.') + 1).toLowerCase();
    }

    /** DB의 상대경로(uploads/banners/xxx.jpg)를 실제 파일 경로로. banners 폴더 밖이면 null (안전장치) */
    private Path toLocalPath(String imagePath) {
        if (imagePath == null) return null;
        String name = Path.of(imagePath).getFileName().toString();
        Path resolved = BANNER_DIR.resolve(name).normalize();
        return resolved.startsWith(BANNER_DIR.normalize()) ? resolved : null;
    }

    private void deleteFilesQuietly(List<Path> paths) {
        for (Path p : paths) {
            try {
                Files.deleteIfExists(p);
            } catch (IOException e) {
                log.warn("배너 이미지 파일을 지우지 못했습니다: {} / {}", p, e.getMessage());
            }
        }
    }

    private void runAfterCommit(Runnable task) {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    task.run();
                }
            });
        } else {
            task.run();
        }
    }
}
