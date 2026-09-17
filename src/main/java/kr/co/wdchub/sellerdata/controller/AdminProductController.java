package kr.co.wdchub.sellerdata.controller;

import kr.co.wdchub.sellerdata.dto.ProductDtos.ProductRequest;
import kr.co.wdchub.sellerdata.dto.ProductDtos.ProductResponse;
import kr.co.wdchub.sellerdata.security.CustomUserDetails; // TODO: 실제 패키지 경로로 수정
import kr.co.wdchub.sellerdata.service.ProductService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

/**
 * 상품 관리 — 관리자 전용
 * 등록/수정은 이미지 파일을 함께 받아야 해서 JSON이 아니라 multipart/form-data로 받습니다.
 * "data" 파트에 텍스트/숫자 필드(JSON), "mainImageFile"에 대표이미지 1장, "detailImageFiles"에 상세이미지 여러 장을 담아 보내야 합니다.
 */
@Controller
@RequiredArgsConstructor
@RequestMapping("/admin/products")
@PreAuthorize("hasRole('ADMIN')")
public class AdminProductController {

    private final ProductService productService;

    @GetMapping
    public String productManagementPage(@AuthenticationPrincipal CustomUserDetails userDetails, Model model) {
        model.addAttribute("companyName", userDetails.getMember().getCompanyName());
        return "admin/products"; // templates/admin/products.html
    }

    @GetMapping("/list")
    @ResponseBody
    public List<ProductResponse> listProducts() {
        return productService.getAllProducts().stream()
                .map(productService::toResponse)
                .toList();
    }

    @PostMapping(consumes = "multipart/form-data")
    @ResponseBody
    public ProductResponse createProduct(
            @RequestPart("data") ProductRequest req,
            @RequestPart(value = "mainImageFile", required = false) MultipartFile mainImageFile,
            @RequestPart(value = "detailImageFiles", required = false) List<MultipartFile> detailImageFiles) {
        return productService.toResponse(productService.createProduct(req, mainImageFile, detailImageFiles));
    }

    @PutMapping(value = "/{id}", consumes = "multipart/form-data")
    @ResponseBody
    public void updateProduct(
            @PathVariable Long id,
            @RequestPart("data") ProductRequest req,
            @RequestPart(value = "mainImageFile", required = false) MultipartFile mainImageFile,
            @RequestPart(value = "detailImageFiles", required = false) List<MultipartFile> detailImageFiles) {
        productService.updateProduct(id, req, mainImageFile, detailImageFiles);
    }

    @DeleteMapping("/{id}")
    @ResponseBody
    public void deleteProduct(@PathVariable Long id) {
        productService.deleteProduct(id);
    }

    // ── 예외 처리 ──────────────────────────────

    @ExceptionHandler(IllegalStateException.class)
    @ResponseBody
    public ResponseEntity<String> handleIllegalState(IllegalStateException e) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
    }

    @ExceptionHandler(IllegalArgumentException.class)
    @ResponseBody
    public ResponseEntity<String> handleIllegalArgument(IllegalArgumentException e) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
    }
}
