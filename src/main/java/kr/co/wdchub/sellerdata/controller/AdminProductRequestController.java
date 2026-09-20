package kr.co.wdchub.sellerdata.controller;

import kr.co.wdchub.sellerdata.dto.ProductRequestDtos.Response;
import kr.co.wdchub.sellerdata.dto.ProductRequestDtos.UpdateRequest;
import kr.co.wdchub.sellerdata.security.CustomUserDetails;
import kr.co.wdchub.sellerdata.service.ProductRequestService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** 요청관리 — 관리자 전용. 회원이 보낸 상품 요청을 확인하고 상태/답변을 남깁니다. */
@Controller
@RequiredArgsConstructor
@RequestMapping("/admin/product-requests")
@PreAuthorize("hasRole('ADMIN')")
public class AdminProductRequestController {

    private final ProductRequestService productRequestService;

    @GetMapping
    public String page(@AuthenticationPrincipal CustomUserDetails userDetails, Model model) {
        model.addAttribute("companyName", userDetails.getMember().getCompanyName());
        return "admin/product-requests"; // templates/admin/product-requests.html
    }

    @GetMapping("/list")
    @ResponseBody
    public List<Response> list() {
        return productRequestService.getAll();
    }

    @PutMapping("/{id}")
    @ResponseBody
    public Response update(@PathVariable Long id, @RequestBody UpdateRequest req) {
        return productRequestService.update(id, req);
    }

    @DeleteMapping("/{id}")
    @ResponseBody
    public void delete(@PathVariable Long id) {
        productRequestService.delete(id);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    @ResponseBody
    public ResponseEntity<String> handleIllegalArgument(IllegalArgumentException e) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
    }
}
