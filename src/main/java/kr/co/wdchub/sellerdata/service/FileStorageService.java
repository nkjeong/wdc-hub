package kr.co.wdchub.sellerdata.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
public class FileStorageService {

    // application.properties에서 경로를 바꿀 수 있게 해뒀어요. 기본값은 프로젝트 실행 위치 기준 uploads 폴더입니다.
    @Value("${app.upload.dir:uploads/business-license}")
    private String uploadDir;

    private static final List<String> ALLOWED_EXTENSIONS = List.of("jpg", "jpeg", "png", "pdf");
    private static final long MAX_FILE_SIZE = 10L * 1024 * 1024; // 10MB

    /**
     * 사업자등록증 파일을 저장하고, 저장된 경로를 반환합니다.
     * 첨부하지 않은 경우(선택 입력)에는 null을 반환합니다.
     */
    public String storeBusinessLicense(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            return null;
        }

        validate(file);

        try {
            Path dirPath = Paths.get(uploadDir);
            Files.createDirectories(dirPath);

            String ext = extractExtension(file.getOriginalFilename());
            // 원본 파일명을 그대로 쓰면 같은 이름이 덮어써질 수 있어서, UUID로 새 이름을 만들어요.
            String savedName = UUID.randomUUID() + "." + ext;

            Path targetPath = dirPath.resolve(savedName);
            Files.copy(file.getInputStream(), targetPath, StandardCopyOption.REPLACE_EXISTING);

            return uploadDir + "/" + savedName;
        } catch (IOException e) {
            throw new IllegalStateException("파일 저장 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.", e);
        }
    }

    private void validate(MultipartFile file) {
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new IllegalArgumentException("파일 크기는 10MB를 넘을 수 없습니다.");
        }
        String ext = extractExtension(file.getOriginalFilename());
        if (!ALLOWED_EXTENSIONS.contains(ext)) {
            throw new IllegalArgumentException("JPG, PNG, PDF 파일만 업로드할 수 있습니다.");
        }
    }

    private String extractExtension(String originalFilename) {
        if (originalFilename == null || !originalFilename.contains(".")) {
            return "";
        }
        return originalFilename.substring(originalFilename.lastIndexOf('.') + 1).toLowerCase(Locale.ROOT);
    }
}
