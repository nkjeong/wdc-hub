package kr.co.wdchub.sellerdata.service;

import kr.co.wdchub.sellerdata.domain.Inquiry;
import kr.co.wdchub.sellerdata.domain.InquiryAttachment;
import kr.co.wdchub.sellerdata.domain.InquiryCategory;
import kr.co.wdchub.sellerdata.domain.InquiryStatus;
import kr.co.wdchub.sellerdata.dto.InquiryDtos.AnswerRequest;
import kr.co.wdchub.sellerdata.dto.InquiryDtos.AttachmentDto;
import kr.co.wdchub.sellerdata.dto.InquiryDtos.InquiryDto;
import kr.co.wdchub.sellerdata.dto.InquiryDtos.InquiryRequest;
import kr.co.wdchub.sellerdata.repository.InquiryAttachmentRepository;
import kr.co.wdchub.sellerdata.repository.InquiryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * 게시판형 1:1 문의.
 * - 회원: 제목·내용·첨부파일(최대 3개, 개당 10MB)로 접수하고 내 문의와 답변을 확인
 * - 관리자: 목록에서 문의를 열어 답변하고 상태(접수/처리중/답변완료)를 관리
 * - 첨부파일은 시놀로지 NAS에 저장하고, 문의를 지우면 NAS 파일도 함께 지웁니다.
 */
@Service
@RequiredArgsConstructor
public class InquiryService {

    private static final int MAX_FILES = 3;
    private static final long MAX_FILE_BYTES = 10L * 1024 * 1024;
    private static final int MAX_TITLE = 200;
    private static final int MAX_TEXT = 4000;

    private final InquiryRepository inquiryRepository;
    private final InquiryAttachmentRepository attachmentRepository;
    private final SynologyUploadService synologyUploadService;
    private final NotificationService notificationService;

    // ── 회원 ─────────────────────────────────

    @Transactional
    public InquiryDto create(InquiryRequest req, List<MultipartFile> files,
                             String username, String company, String phone) {
        String title = req.title() == null ? "" : req.title().trim();
        String content = req.content() == null ? "" : req.content().trim();
        if (title.isEmpty()) throw new IllegalArgumentException("제목을 입력해 주세요.");
        if (title.length() > MAX_TITLE) throw new IllegalArgumentException("제목은 " + MAX_TITLE + "자 이내로 입력해 주세요.");
        if (content.isEmpty()) throw new IllegalArgumentException("문의 내용을 입력해 주세요.");
        if (content.length() > MAX_TEXT) throw new IllegalArgumentException("문의 내용은 " + MAX_TEXT + "자 이내로 입력해 주세요.");

        List<MultipartFile> valid = files == null ? List.of()
                : files.stream().filter(f -> f != null && !f.isEmpty()).toList();
        if (valid.size() > MAX_FILES) {
            throw new IllegalArgumentException("첨부파일은 최대 " + MAX_FILES + "개까지 올릴 수 있어요.");
        }
        for (MultipartFile f : valid) {
            if (f.getSize() > MAX_FILE_BYTES) {
                throw new IllegalArgumentException("첨부파일은 개당 10MB 이하만 올릴 수 있어요: " + f.getOriginalFilename());
            }
        }

        InquiryCategory category = req.category() != null ? req.category() : InquiryCategory.ETC;
        Inquiry saved = inquiryRepository.save(Inquiry.builder()
                .requesterUsername(username)
                .requesterCompany(company)
                .requesterPhone(phone)
                .category(category)
                .title(title)
                .content(content)
                .status(InquiryStatus.RECEIVED)
                .build());

        // 파일 업로드가 실패하면 예외가 나면서 문의 저장도 함께 취소됩니다.
        List<InquiryAttachment> attachments = new ArrayList<>();
        for (MultipartFile f : valid) {
            String url = synologyUploadService.upload(f);
            String name = f.getOriginalFilename() != null ? f.getOriginalFilename() : "attachment";
            attachments.add(attachmentRepository.save(InquiryAttachment.builder()
                    .inquiryId(saved.getId())
                    .fileUrl(url)
                    .fileName(name.length() > 255 ? name.substring(0, 255) : name)
                    .build()));
        }

        // 관리자에게 벨 + 시놀로지 Chat + 카카오 알림톡
        String who = (company == null || company.isBlank()) ? username : company;
        notificationService.notifyAdmins(
                "INQUIRY_NEW",
                "새 1:1 문의",
                who + " · " + cut(title, 60),
                "/admin/inquiries",
                "회원: " + who + " (" + username + ")\n분류: " + category.getLabel() + "\n제목: " + cut(title, 100),
                "ADMIN_INQUIRY_NEW",
                Map.of("회사명", who, "제목", title));

        return toDto(saved, attachments);
    }

    @Transactional(readOnly = true)
    public List<InquiryDto> getMine(String username) {
        return toDtos(inquiryRepository.findAllByRequesterUsernameOrderByCreatedAtDesc(username));
    }

    // ── 관리자 ───────────────────────────────

    @Transactional(readOnly = true)
    public List<InquiryDto> getAll() {
        return toDtos(inquiryRepository.findAllByOrderByCreatedAtDesc());
    }

    @Transactional
    public InquiryDto answer(Long id, AnswerRequest req) {
        Inquiry q = inquiryRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 문의입니다. id=" + id));
        if (req.status() == null) throw new IllegalArgumentException("처리 상태를 선택해 주세요.");

        String answer = req.answer() == null ? "" : req.answer().trim();
        if (answer.length() > MAX_TEXT) throw new IllegalArgumentException("답변은 " + MAX_TEXT + "자 이내로 입력해 주세요.");
        if (req.status() == InquiryStatus.ANSWERED && answer.isEmpty()) {
            throw new IllegalArgumentException("'답변완료'로 바꾸려면 답변 내용을 입력해 주세요.");
        }
        String newAnswer = answer.isEmpty() ? null : answer;

        InquiryStatus oldStatus = q.getStatus();
        String oldAnswer = q.getAnswer();
        boolean statusChanged = oldStatus != req.status();
        boolean answerChanged = newAnswer != null && !newAnswer.equals(oldAnswer);

        q.setStatus(req.status());
        q.setAnswer(newAnswer);
        if (newAnswer == null) q.setAnsweredAt(null);
        else if (answerChanged) q.setAnsweredAt(LocalDateTime.now());

        // 상태가 바뀌었거나 답변이 새로 등록/수정됐을 때만 회원에게 알립니다.
        if (statusChanged || answerChanged) {
            String msg = cut(q.getTitle(), 60) + " · " + req.status().getLabel()
                    + (answerChanged ? " · 답변이 등록됐어요" : "");
            notificationService.notifyMember(q.getRequesterUsername(), "INQUIRY_ANSWERED",
                    "1:1 문의 처리 상태가 바뀌었어요", msg, "/inquiries");
            notificationService.alertMember(q.getRequesterPhone(), "MEMBER_INQUIRY_ANSWERED",
                    Map.of("제목", cut(q.getTitle(), 30), "상태", req.status().getLabel()));
        }
        return toDtos(List.of(q)).get(0);
    }

    /** 문의를 지우면 첨부파일(DB 기록 + NAS 파일)도 함께 지웁니다. */
    @Transactional
    public void delete(Long id) {
        List<InquiryAttachment> attachments = attachmentRepository.findByInquiryId(id);
        for (InquiryAttachment a : attachments) {
            synologyUploadService.delete(a.getFileUrl()); // DB 삭제가 커밋된 뒤에 NAS 파일을 지웁니다
        }
        attachmentRepository.deleteAll(attachments);
        inquiryRepository.deleteById(id);
    }

    // ── 첨부파일 다운로드용 ──────────────────

    /**
     * 첨부파일 조회. username이 null이면 관리자용(제한 없음),
     * 값이 있으면 그 회원이 접수한 문의의 첨부파일일 때만 돌려줍니다.
     */
    @Transactional(readOnly = true)
    public InquiryAttachment getAttachment(Long attachmentId, String username) {
        InquiryAttachment a = attachmentRepository.findById(attachmentId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 첨부파일입니다."));
        if (username != null) {
            Inquiry q = inquiryRepository.findById(a.getInquiryId()).orElse(null);
            if (q == null || !username.equals(q.getRequesterUsername())) {
                throw new IllegalArgumentException("존재하지 않는 첨부파일입니다.");
            }
        }
        return a;
    }

    // ── 내부 ─────────────────────────────────

    private List<InquiryDto> toDtos(List<Inquiry> list) {
        if (list.isEmpty()) return List.of();
        List<Long> ids = list.stream().map(Inquiry::getId).toList();
        Map<Long, List<InquiryAttachment>> byInquiry = new HashMap<>();
        for (InquiryAttachment a : attachmentRepository.findByInquiryIdIn(ids)) {
            byInquiry.computeIfAbsent(a.getInquiryId(), k -> new ArrayList<>()).add(a);
        }
        return list.stream().map(q -> toDto(q, byInquiry.getOrDefault(q.getId(), List.of()))).toList();
    }

    private InquiryDto toDto(Inquiry q, List<InquiryAttachment> attachments) {
        return new InquiryDto(
                q.getId(), q.getCategory().name(), q.getCategory().getLabel(),
                q.getTitle(), q.getContent(),
                q.getStatus().name(), q.getStatus().getLabel(),
                q.getAnswer(), q.getAnsweredAt(),
                q.getRequesterUsername(), q.getRequesterCompany(), q.getCreatedAt(),
                attachments.stream().map(a -> new AttachmentDto(a.getId(), a.getFileName())).collect(Collectors.toList()));
    }

    private String cut(String s, int max) {
        return s.length() <= max ? s : s.substring(0, max);
    }
}
