package kr.co.wdchub.sellerdata.controller;

import kr.co.wdchub.sellerdata.domain.OrderStatus;
import kr.co.wdchub.sellerdata.dto.OrderDtos.ExportConflict;
import kr.co.wdchub.sellerdata.dto.OrderDtos.ExportLogDto;
import kr.co.wdchub.sellerdata.dto.OrderDtos.ExportRequest;
import kr.co.wdchub.sellerdata.dto.OrderDtos.OrderDto;
import kr.co.wdchub.sellerdata.dto.OrderDtos.StatusUpdateRequest;
import kr.co.wdchub.sellerdata.security.CustomUserDetails;
import kr.co.wdchub.sellerdata.service.OrderService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 주문관리 — 관리자 전용. 사이드바의 "주문확인" 메뉴.
 * - GET /admin/orders                 : 화면 (상태별 탭)
 * - GET /admin/orders/list?status=    : 전체 주문 목록(JSON). status 없으면 전체
 * - PUT /admin/orders/{id}/status     : 처리 상태·택배사·송장번호 저장
 */
@Controller
@RequestMapping("/admin/orders")
@PreAuthorize("hasRole('ADMIN')")
public class AdminOrderController {

    private final OrderService orderService;

    public AdminOrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    @GetMapping
    public String page(@AuthenticationPrincipal CustomUserDetails user, Model model) {
        model.addAttribute("companyName", user.getMember().getCompanyName());
        return "admin/orders"; // templates/admin/orders.html
    }

    @GetMapping("/list")
    @ResponseBody
    public List<OrderDto> list(@RequestParam(required = false) String status) {
        OrderStatus s = null;
        if (status != null && !status.isBlank()) {
            try {
                s = OrderStatus.valueOf(status);
            } catch (Exception e) {
                throw new IllegalArgumentException("처리 상태 값이 올바르지 않아요.");
            }
        }
        return orderService.getAllForAdmin(s);
    }

    @PutMapping("/{id}/status")
    @ResponseBody
    public OrderDto updateStatus(@PathVariable Long id, @RequestBody StatusUpdateRequest req) {
        return orderService.updateStatus(id, req);
    }

    /**
     * "주문접수" 탭에서 엑셀을 내려받을 때 호출합니다.
     * force=false(처음 시도)인데 이미 한 번 받은 적 있는 주문이 섞여 있으면 409로 그 주문번호들을 돌려주고,
     * 프론트가 "확인된 주문건입니다. 다시 다운로드하시겠습니까?" 확인창을 띄운 뒤 force=true로 다시 요청합니다.
     * 성공하면 "주문접수" 상태였던 주문은 자동으로 "주문확인"으로 바뀌고, 다운로드 기록이 한 줄 남습니다.
     */
    @PostMapping("/export")
    @ResponseBody
    public ResponseEntity<?> export(@RequestBody ExportRequest req, @AuthenticationPrincipal CustomUserDetails user) {
        if (!Boolean.TRUE.equals(req.force())) {
            List<String> already = orderService.findAlreadyDownloadedCodes(req.orderIds());
            if (!already.isEmpty()) {
                return ResponseEntity.status(HttpStatus.CONFLICT).body(new ExportConflict(already));
            }
        }
        return ResponseEntity.ok(orderService.exportAndConfirm(req.orderIds(), user.getUsername()));
    }

    /** "주문접수" 탭에 보여줄 다운로드 내역(최근 20건) */
    @GetMapping("/export-log")
    @ResponseBody
    public List<ExportLogDto> exportLog() {
        return orderService.getExportLog();
    }

    @ExceptionHandler(IllegalArgumentException.class)
    @ResponseBody
    public ResponseEntity<String> handleIllegalArgument(IllegalArgumentException e) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
    }
}
