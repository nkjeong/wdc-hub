package kr.co.wdchub.sellerdata.service;

import kr.co.wdchub.sellerdata.domain.ProductRequest;
import kr.co.wdchub.sellerdata.domain.ProductRequestField;
import kr.co.wdchub.sellerdata.domain.ProductRequestStatus;
import kr.co.wdchub.sellerdata.dto.ProductRequestDtos.CreateRequest;
import kr.co.wdchub.sellerdata.dto.ProductRequestDtos.Response;
import kr.co.wdchub.sellerdata.dto.ProductRequestDtos.UpdateRequest;
import kr.co.wdchub.sellerdata.repository.ProductRequestRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class ProductRequestService {

    public static final String TYPE_MODIFY = "MODIFY";
    private static final int MAX_CONTENT_LENGTH = 2000;

    private final ProductRequestRepository productRequestRepository;
    private final NotificationService notificationService;

    // ── 회원 ─────────────────────────────────

    @Transactional
    public Response createModifyRequest(CreateRequest req, String username, String company, String phone) {
        String productName = req.productName() == null ? "" : req.productName().trim();
        String content = req.content() == null ? "" : req.content().trim();

        if (productName.isEmpty()) {
            throw new IllegalArgumentException("요청할 상품 정보를 찾을 수 없어요. 상품을 다시 선택해 주세요.");
        }
        if (content.isEmpty()) {
            throw new IllegalArgumentException("수정을 원하는 내용을 입력해 주세요.");
        }
        if (content.length() > MAX_CONTENT_LENGTH) {
            throw new IllegalArgumentException("내용은 " + MAX_CONTENT_LENGTH + "자 이내로 입력해 주세요.");
        }

        ProductRequest saved = productRequestRepository.save(ProductRequest.builder()
                .requestType(TYPE_MODIFY)
                .productId(req.productId())
                .productName(cut(productName, 255))
                .productBarcode(req.productBarcode() == null ? null : cut(req.productBarcode().trim(), 50))
                .fieldType(req.fieldType() != null ? req.fieldType() : ProductRequestField.ETC)
                .content(content)
                .status(ProductRequestStatus.RECEIVED)
                .requesterUsername(username)
                .requesterCompany(company)
                .requesterPhone(phone)
                .build());

        // 관리자에게 벨 알림 + 시놀로지 Chat 알림
        String who = (company == null || company.isBlank()) ? username : company;
        notificationService.notifyAdmins(
                "PRODUCT_REQUEST_NEW",
                "새 상품정보 수정 요청",
                who + " · " + saved.getProductName() + " (" + saved.getFieldType().getLabel() + ")",
                "/admin/product-requests",
                "회원: " + who + " (" + username + ")\n"
                        + "상품: " + saved.getProductName() + "\n"
                        + "항목: " + saved.getFieldType().getLabel() + "\n"
                        + "내용: " + cut(content.replace('\n', ' '), 100),
                "ADMIN_REQUEST_NEW",
                Map.of("회사명", who, "상품명", saved.getProductName(), "항목", saved.getFieldType().getLabel()));
        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<Response> getMine(String username) {
        return productRequestRepository.findAllByRequesterUsernameOrderByCreatedAtDesc(username).stream()
                .map(this::toResponse)
                .toList();
    }

    // ── 관리자 ───────────────────────────────

    @Transactional(readOnly = true)
    public List<Response> getAll() {
        return productRequestRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public Response update(Long id, UpdateRequest req) {
        ProductRequest pr = productRequestRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 요청입니다. id=" + id));
        if (req.status() == null) {
            throw new IllegalArgumentException("처리 상태를 선택해 주세요.");
        }
        String note = req.adminNote() == null ? null : req.adminNote().trim();
        if (note != null && note.length() > MAX_CONTENT_LENGTH) {
            throw new IllegalArgumentException("답변은 " + MAX_CONTENT_LENGTH + "자 이내로 입력해 주세요.");
        }
        ProductRequestStatus oldStatus = pr.getStatus();
        String oldNote = pr.getAdminNote();
        String newNote = (note == null || note.isEmpty()) ? null : note;

        pr.setStatus(req.status());
        pr.setAdminNote(newNote);

        // 상태가 바뀌었거나 답변이 새로 등록/수정됐을 때만 회원에게 알립니다 (같은 내용 저장은 알림 없음)
        boolean statusChanged = oldStatus != req.status();
        boolean noteChanged = newNote != null && !newNote.equals(oldNote);
        if (statusChanged || noteChanged) {
            String msg = pr.getProductName() + " · " + req.status().getLabel()
                    + (noteChanged ? " · 관리자 답변이 등록됐어요" : "");
            notificationService.notifyMember(
                    pr.getRequesterUsername(),
                    "PRODUCT_REQUEST_UPDATED",
                    "수정 요청 처리 상태가 바뀌었어요",
                    msg,
                    "/product-requests");
            // 회원 휴대폰으로 카카오톡 알림톡 (템플릿이 설정된 경우에만 발송됩니다)
            notificationService.alertMember(pr.getRequesterPhone(), "MEMBER_REQUEST_UPDATED",
                    Map.of("상품명", pr.getProductName(), "상태", req.status().getLabel()));
        }
        return toResponse(pr);
    }

    @Transactional
    public void delete(Long id) {
        productRequestRepository.deleteById(id);
    }

    // ── 내부 ─────────────────────────────────

    private String cut(String s, int max) {
        return s.length() <= max ? s : s.substring(0, max);
    }

    private Response toResponse(ProductRequest p) {
        return new Response(
                p.getId(), p.getRequestType(), p.getProductId(), p.getProductName(), p.getProductBarcode(),
                p.getFieldType().name(), p.getFieldType().getLabel(),
                p.getContent(),
                p.getStatus().name(), p.getStatus().getLabel(),
                p.getAdminNote(), p.getRequesterUsername(), p.getRequesterCompany(),
                p.getCreatedAt(), p.getUpdatedAt()
        );
    }
}
