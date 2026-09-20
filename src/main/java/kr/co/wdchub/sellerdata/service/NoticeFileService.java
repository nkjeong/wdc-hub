package kr.co.wdchub.sellerdata.service;

import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

/**
 * 공지사항 첨부파일 저장 서비스. 리사이즈가 필요 없어서(이미지가 아닐 수도 있음)
 * 로컬에 저장하지 않고 MultipartFile을 그대로 시놀로지(wdc-hub.synology.me)로 업로드합니다.
 */
@Service
public class NoticeFileService {

    private static final long MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20MB

    private final SynologyUploadService synologyUploadService;

    public NoticeFileService(SynologyUploadService synologyUploadService) {
        this.synologyUploadService = synologyUploadService;
    }

    public record StoredFile(String url, String originalFileName) {}

    public StoredFile storeFile(MultipartFile file) {
        if (file == null || file.isEmpty()) return null;
        if (file.getSize() > MAX_FILE_SIZE_BYTES) {
            throw new IllegalArgumentException("첨부파일 크기는 20MB를 넘을 수 없습니다.");
        }

        String originalName = file.getOriginalFilename() != null ? file.getOriginalFilename() : "attachment";
        String url = synologyUploadService.upload(file);
        return new StoredFile(url, originalName);
    }

    // TODO: 시놀로지 쪽 삭제 API가 확인되면 실제로 지우도록 구현됩니다. 지금은 로그만 남깁니다.
    public void deleteFile(String url) {
        synologyUploadService.delete(url);
    }
}
