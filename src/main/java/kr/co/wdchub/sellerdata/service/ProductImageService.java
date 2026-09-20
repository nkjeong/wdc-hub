package kr.co.wdchub.sellerdata.service;

import net.coobird.thumbnailator.Thumbnails;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * 상품 이미지 저장 서비스
 * - 대표이미지: 원본 1장을 받아서 4개 버전(썸네일/뷰어용/미디엄/원본)을 만들어 시놀로지(wdc-hub.synology.me)로 업로드
 * - 상세이미지: 리사이즈 없이 원본 그대로 + 표시용(520px) 버전을 만들어 업로드
 *
 * 리사이즈(Thumbnailator)는 실제 파일이 있어야 동작하기 때문에, 서버 로컬의 임시 폴더(uploads/tmp)에
 * 잠깐 만들었다가 시놀로지로 전송하고, 전송이 끝나면 로컬 임시 파일은 바로 지웁니다.
 * DB에는 로컬 경로가 아니라 시놀로지가 돌려준 절대 URL이 그대로 저장됩니다.
 */
@Service
public class ProductImageService {

    private static final long MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
    private static final List<String> ALLOWED_EXT = List.of("jpg", "jpeg", "png", "webp");

    private static final int THUMB_SIZE = 200;  // 리스트용
    private static final int DETAIL_VIEW_SIZE = 500; // 상품 상세 Offcanvas 대표이미지 표시용
    private static final int MEDIUM_SIZE = 800; // (다른 화면에서 필요할 수 있어 유지)
    private static final int DETAIL_IMAGE_VIEW_WIDTH = 520; // 상세이미지(설명 이미지) 표시용 가로 크기

    private static final Path TEMP_ROOT = Path.of("uploads/tmp");

    private final SynologyUploadService synologyUploadService;

    public ProductImageService(SynologyUploadService synologyUploadService) {
        this.synologyUploadService = synologyUploadService;
    }

    public record MainImageUrls(String thumbUrl, String detailViewUrl, String mediumUrl, String originalUrl) {}

    /** 대표이미지 원본 1장을 받아 썸네일/상세뷰어용(500px)/미디엄/원본 4개를 만들어 시놀로지에 업로드합니다 */
    public MainImageUrls storeMainImage(MultipartFile file) {
        validate(file);
        Path originalPath = null, mediumPath = null, detailViewPath = null, thumbPath = null;
        try {
            Files.createDirectories(TEMP_ROOT);

            String ext = extractExt(file.getOriginalFilename());
            String uuid = UUID.randomUUID().toString();

            originalPath = TEMP_ROOT.resolve(uuid + "-original." + ext);
            mediumPath = TEMP_ROOT.resolve(uuid + "-medium." + ext);
            detailViewPath = TEMP_ROOT.resolve(uuid + "-detail500." + ext);
            thumbPath = TEMP_ROOT.resolve(uuid + "-thumb." + ext);

            // 원본은 그대로 임시 저장 (업로드용)
            file.transferTo(originalPath);

            // 나머지는 비율 유지한 채로 지정된 크기 안에 들어가도록 리사이즈
            Thumbnails.of(originalPath.toFile()).size(MEDIUM_SIZE, MEDIUM_SIZE).toFile(mediumPath.toFile());
            Thumbnails.of(originalPath.toFile()).size(DETAIL_VIEW_SIZE, DETAIL_VIEW_SIZE).toFile(detailViewPath.toFile());
            Thumbnails.of(originalPath.toFile()).size(THUMB_SIZE, THUMB_SIZE).toFile(thumbPath.toFile());

            // 4개 다 시놀로지로 업로드하고, 돌려받은 절대 URL을 그대로 씁니다.
            String thumbUrl = synologyUploadService.upload(thumbPath, uuid + "-thumb." + ext);
            String detailViewUrl = synologyUploadService.upload(detailViewPath, uuid + "-detail500." + ext);
            String mediumUrl = synologyUploadService.upload(mediumPath, uuid + "-medium." + ext);
            String originalUrl = synologyUploadService.upload(originalPath, uuid + "-original." + ext);

            return new MainImageUrls(thumbUrl, detailViewUrl, mediumUrl, originalUrl);
        } catch (IOException e) {
            throw new IllegalStateException("대표이미지 처리 중 오류가 발생했습니다.", e);
        } finally {
            deleteTempQuietly(originalPath, mediumPath, detailViewPath, thumbPath);
        }
    }

    /** 상세이미지 저장 결과 — 원본 URL 목록과, 화면 표시용(가로 520px) URL 목록을 함께 담습니다 (줄바꿈으로 구분, 같은 순서) */
    public record DetailImageUrls(String originalUrls, String viewUrls) {}

    /**
     * 상세이미지 여러 장을 처리합니다.
     * - 원본은 그대로 업로드 (엑셀 다운로드 등에서 원본 주소가 필요할 때 사용)
     * - 화면 표시용으로 가로 520px 기준으로 리사이즈한 버전도 함께 업로드합니다 (세로는 비율 유지)
     */
    public DetailImageUrls storeDetailImages(List<MultipartFile> files) {
        if (files == null || files.isEmpty()) return null;

        List<String> originalUrls = new ArrayList<>();
        List<String> viewUrls = new ArrayList<>();

        try {
            Files.createDirectories(TEMP_ROOT);

            for (MultipartFile file : files) {
                if (file.isEmpty()) continue;
                validate(file);

                String ext = extractExt(file.getOriginalFilename());
                String uuid = UUID.randomUUID().toString();
                Path originalPath = TEMP_ROOT.resolve(uuid + "-detail." + ext);
                Path viewPath = TEMP_ROOT.resolve(uuid + "-detail-view520." + ext);

                try {
                    file.transferTo(originalPath);
                    // 가로 520px 기준으로 리사이즈 (세로는 비율 유지)
                    Thumbnails.of(originalPath.toFile()).width(DETAIL_IMAGE_VIEW_WIDTH).toFile(viewPath.toFile());

                    originalUrls.add(synologyUploadService.upload(originalPath, uuid + "-detail." + ext));
                    viewUrls.add(synologyUploadService.upload(viewPath, uuid + "-detail-view520." + ext));
                } finally {
                    deleteTempQuietly(originalPath, viewPath);
                }
            }

            if (originalUrls.isEmpty()) return null;
            return new DetailImageUrls(String.join("\n", originalUrls), String.join("\n", viewUrls));
        } catch (IOException e) {
            throw new IllegalStateException("상세이미지 처리 중 오류가 발생했습니다.", e);
        }
    }

    // ── 파일 삭제 ──────────────────────────────────
    // TODO: 시놀로지 쪽 삭제 API가 확인되면 SynologyUploadService.delete()가 실제로 지우도록 구현됩니다.
    // 지금은 로그만 남기고, 상품/상세이미지 삭제·교체 흐름 자체는 그대로 동작합니다.

    public void deleteFiles(String... urls) {
        if (urls == null) return;
        for (String url : urls) {
            synologyUploadService.delete(url);
        }
    }

    public void deleteFileList(String newlineSeparatedUrls) {
        if (newlineSeparatedUrls == null || newlineSeparatedUrls.isBlank()) return;
        for (String url : newlineSeparatedUrls.split("\n")) {
            synologyUploadService.delete(url);
        }
    }

    // ── 내부 헬퍼 ──────────────────────────────────

    private void validate(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("이미지 파일이 비어있습니다.");
        }
        if (file.getSize() > MAX_FILE_SIZE_BYTES) {
            throw new IllegalArgumentException("이미지 파일 크기는 10MB를 넘을 수 없습니다.");
        }
        String ext = extractExt(file.getOriginalFilename());
        if (!ALLOWED_EXT.contains(ext)) {
            throw new IllegalArgumentException("JPG, PNG, WEBP 이미지만 업로드할 수 있습니다.");
        }
    }

    private String extractExt(String filename) {
        if (filename == null || !filename.contains(".")) return "jpg";
        return filename.substring(filename.lastIndexOf('.') + 1).toLowerCase();
    }

    private void deleteTempQuietly(Path... paths) {
        for (Path p : paths) {
            if (p == null) continue;
            try {
                Files.deleteIfExists(p);
            } catch (IOException ignored) {
                // 임시 파일 정리 실패는 무시해도 괜찮습니다 (다음 재시작 시 남아있어도 서비스에 지장 없음)
            }
        }
    }
}
