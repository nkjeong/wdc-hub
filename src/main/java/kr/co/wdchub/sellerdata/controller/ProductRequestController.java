package kr.co.wdchub.sellerdata.controller;

import kr.co.wdchub.sellerdata.dto.ProductRequestDtos.CreateRequest;
import kr.co.wdchub.sellerdata.dto.ProductRequestDtos.Response;
import kr.co.wdchub.sellerdata.security.CustomUserDetails;
import kr.co.wdchub.sellerdata.service.ProductRequestService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 회원용 상품정보 수정 요청.
 * - GET  /product-requests        : 요청 화면 (상품 찾기 + 내 요청 내역)
 * - GET  /product-requests/mine   : 내 요청 목록(JSON)
 * - POST /product-requests        : 수정 요청 보내기(JSON) — 상품 상세창의 '정보수정 요청' 버튼도 이 주소를 씁니다
 */
@Controller
@RequiredArgsConstructor
@RequestMapping("/product-requests")
public class ProductRequestController {

    private final ProductRequestService productRequestService;

    @GetMapping
    public String page(@AuthenticationPrincipal CustomUserDetails userDetails, Model model) {
        model.addAttribute("companyName", userDetails.getMember().getCompanyName());
        return "product-requests"; // templates/product-requests.html
    }

    @GetMapping("/mine")
    @ResponseBody
    public List<Response> mine(@AuthenticationPrincipal CustomUserDetails userDetails) {
        return productRequestService.getMine(userDetails.getUsername());
    }

    @PostMapping
    @ResponseBody
    public Response create(@RequestBody CreateRequest req,
                           @AuthenticationPrincipal CustomUserDetails userDetails) {
        return productRequestService.createModifyRequest(
                req, userDetails.getUsername(), userDetails.getMember().getCompanyName());
    }

    @ExceptionHandler(IllegalArgumentException.class)
    @ResponseBody
    public ResponseEntity<String> handleIllegalArgument(IllegalArgumentException e) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
    }
}
