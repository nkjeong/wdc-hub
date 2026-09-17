package kr.co.wdchub.sellerdata.service;

import net.coobird.thumbnailator.Thumbnails;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * 상품 이미지 저장 서비스
 * - 대표이미지: 원본 1장을 받아서 4개 버전(썸네일/뷰어용/미디엄/원본)을 만들어 저장
 * - 상세이미지: 리사이즈 없이 원본 그대로 여러 장 저장
 *
 * 저장 위치는 app.upload.dir 하위의 product-images 폴더이며,
 * WebConfig에서 이미 "/uploads/**" -> "file:uploads/"로 서빙하고 있으므로 그대로 재사용합니다.
 */
@Service
public class ProductImageService {

    private static final long MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
    private static final List<String> ALLOWED_EXT = List.of("jpg", "jpeg", "png", "webp");

    private static final int THUMB_SIZE = 200;  // 리스트용
    private static final int DETAIL_VIEW_SIZE = 500; // 상품 상세 Offcanvas 대표이미지 표시용
    private static final int MEDIUM_SIZE = 800; // (다른 화면에서 필요할 수 있어 유지)
    private static final int DETAIL_IMAGE_VIEW_WIDTH = 520; // 상세이미지(설명 이미지) 표시용 가로 크기

    private final Path uploadRoot;

    public ProductImageService(@Value("${app.upload.dir}") String uploadDir) {
        // app.upload.dir 예: "uploads/business-license" -> 상위 "uploads" 폴더를 기준으로 product-images 폴더를 씀
        Path baseUploadDir = Paths.get(uploadDir).getParent();
        this.uploadRoot = (baseUploadDir != null ? baseUploadDir : Paths.get("uploads")).resolve("product-images");
    }

    public record MainImageUrls(String thumbUrl, String detailViewUrl, String mediumUrl, String originalUrl) {}

    /** 대표이미지 원본 1장을 받아 썸네일/상세뷰어용(500px)/미디엄/원본 4개를 저장하고 웹 경로를 반환합니다 */
    public MainImageUrls storeMainImage(MultipartFile file) {
        validate(file);
        try {
            Files.createDirectories(uploadRoot);

            String ext = extractExt(file.getOriginalFilename());
            String uuid = UUID.randomUUID().toString();

            Path originalPath = uploadRoot.resolve(uuid + "-original." + ext);
            Path mediumPath = uploadRoot.resolve(uuid + "-medium." + ext);
            Path detailViewPath = uploadRoot.resolve(uuid + "-detail500." + ext);
            Path thumbPath = uploadRoot.resolve(uuid + "-thumb." + ext);

            // 원본은 그대로 저장 (다운로드용)
            file.transferTo(originalPath);

            // 나머지는 비율 유지한 채로 지정된 크기 안에 들어가도록 리사이즈
            Thumbnails.of(originalPath.toFile()).size(MEDIUM_SIZE, MEDIUM_SIZE).toFile(mediumPath.toFile());
            Thumbnails.of(originalPath.toFile()).size(DETAIL_VIEW_SIZE, DETAIL_VIEW_SIZE).toFile(detailViewPath.toFile());
            Thumbnails.of(originalPath.toFile()).size(THUMB_SIZE, THUMB_SIZE).toFile(thumbPath.toFile());

            return new MainImageUrls(
                    toWebPath(thumbPath),
                    toWebPath(detailViewPath),
                    toWebPath(mediumPath),
                    toWebPath(originalPath)
            );
        } catch (IOException e) {
            throw new IllegalStateException("대표이미지 저장 중 오류가 발생했습니다.", e);
        }
    }

    /** 상세이미지 저장 결과 — 원본 경로 목록과, 화면 표시용(가로 520px)으로 리사이즈한 경로 목록을 함께 담습니다 (줄바꿈으로 구분, 같은 순서) */
    public record DetailImageUrls(String originalUrls, String viewUrls) {}

    /**
     * 상세이미지 여러 장을 저장합니다.
     * - 원본은 그대로 저장 (엑셀 다운로드 등에서 원본 주소가 필요할 때 사용)
     * - 화면 표시용으로 가로 520px 기준으로 리사이즈한 버전도 함께 만듭니다 (세로는 비율 유지)
     */
    public DetailImageUrls storeDetailImages(List<MultipartFile> files) {
        if (files == null || files.isEmpty()) return null;

        try {
            Files.createDirectories(uploadRoot);
            List<String> originalPaths = new ArrayList<>();
            List<String> viewPaths = new ArrayList<>();

            for (MultipartFile file : files) {
                if (file.isEmpty()) continue;
                validate(file);

                String ext = extractExt(file.getOriginalFilename());
                String uuid = UUID.randomUUID().toString();
                Path originalPath = uploadRoot.resolve(uuid + "-detail." + ext);
                Path viewPath = uploadRoot.resolve(uuid + "-detail-view520." + ext);

                file.transferTo(originalPath);
                // 가로 520px 기준으로 리사이즈 (세로는 비율 유지)
                Thumbnails.of(originalPath.toFile()).width(DETAIL_IMAGE_VIEW_WIDTH).toFile(viewPath.toFile());

                originalPaths.add(toWebPath(originalPath));
                viewPaths.add(toWebPath(viewPath));
            }

            if (originalPaths.isEmpty()) return null;
            return new DetailImageUrls(String.join("\n", originalPaths), String.join("\n", viewPaths));
        } catch (IOException e) {
            throw new IllegalStateException("상세이미지 저장 중 오류가 발생했습니다.", e);
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

    /** 파일시스템 경로를 WebConfig의 "/uploads/**" 매핑에 맞는 웹 경로로 변환 (예: uploads/product-images/xxx-thumb.jpg) */
    private String toWebPath(Path path) {
        return path.toString().replace("\\", "/");
    }
}
