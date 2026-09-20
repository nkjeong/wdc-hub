package kr.co.wdchub.sellerdata.service;

import kr.co.wdchub.sellerdata.domain.Notice;
import kr.co.wdchub.sellerdata.dto.NoticeDtos.NoticeRequest;
import kr.co.wdchub.sellerdata.dto.NoticeDtos.NoticeResponse;
import kr.co.wdchub.sellerdata.repository.NoticeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.util.List;

@Service
@RequiredArgsConstructor
public class NoticeService {

    private final NoticeRepository noticeRepository;
    private final NoticeFileService noticeFileService;

    /** 대시보드 위젯 등에서 쓰는 "최근 N개" 조회 */
    public List<NoticeResponse> getRecent(int limit) {
        return noticeRepository.findAllByOrderByCreatedAtDesc(PageRequest.of(0, limit)).stream()
                .map(this::toResponse)
                .toList();
    }

    /** 공지사항 전체보기/관리자 목록용 — 전체를 최신순으로 반환 */
    public List<NoticeResponse> getAll() {
        return noticeRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(this::toResponse)
                .toList();
    }

    /** 단건 조회 (첨부파일 다운로드 등에서 사용) */
    public NoticeResponse getById(Long id) {
        return noticeRepository.findById(id)
                .map(this::toResponse)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 공지사항입니다. id=" + id));
    }

    @Transactional
    public NoticeResponse create(NoticeRequest req, MultipartFile file) {
        Notice notice = Notice.builder()
                .tag(req.tag())
                .title(req.title())
                .content(req.content())
                .build();

        NoticeFileService.StoredFile stored = noticeFileService.storeFile(file);
        if (stored != null) {
            notice.setAttachmentUrl(stored.url());
            notice.setAttachmentFileName(stored.originalFileName());
        }

        return toResponse(noticeRepository.save(notice));
    }

    @Transactional
    public void update(Long id, NoticeRequest req, MultipartFile file) {
        Notice notice = noticeRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 공지사항입니다. id=" + id));

        notice.setTag(req.tag());
        notice.setTitle(req.title());
        notice.setContent(req.content());

        // 새 파일을 올렸을 때만 기존 첨부파일을 교체합니다 (안 올리면 기존 첨부파일 그대로 유지).
        if (file != null && !file.isEmpty()) {
            String oldUrl = notice.getAttachmentUrl();
            NoticeFileService.StoredFile stored = noticeFileService.storeFile(file);
            notice.setAttachmentUrl(stored.url());
            notice.setAttachmentFileName(stored.originalFileName());
            noticeFileService.deleteFile(oldUrl);
        }
    }

    @Transactional
    public void delete(Long id) {
        Notice notice = noticeRepository.findById(id).orElse(null);
        if (notice != null) {
            noticeFileService.deleteFile(notice.getAttachmentUrl());
        }
        noticeRepository.deleteById(id);
    }

    public NoticeResponse toResponse(Notice n) {
        return new NoticeResponse(
                n.getId(), n.getTag(), n.getTag().getLabel(), n.getTitle(), n.getContent(),
                toAbsoluteUrl(n.getAttachmentUrl()), n.getAttachmentFileName(), n.getCreatedAt()
        );
    }

    /** 상대경로를 현재 요청의 스킴/도메인/포트 기준 절대 URL로 바꿔줍니다 (ProductService와 같은 방식) */
    private String toAbsoluteUrl(String relativePath) {
        if (relativePath == null || relativePath.isBlank()) return null;
        // 시놀로지 등 외부 파일 서버가 이미 완전한 URL을 돌려준 경우엔 그대로 씁니다 (다시 조합하면 깨짐).
        if (relativePath.startsWith("http://") || relativePath.startsWith("https://")) return relativePath;
        String path = relativePath.startsWith("/") ? relativePath : "/" + relativePath;
        return ServletUriComponentsBuilder.fromCurrentContextPath()
                .path(path)
                .toUriString();
    }
}
