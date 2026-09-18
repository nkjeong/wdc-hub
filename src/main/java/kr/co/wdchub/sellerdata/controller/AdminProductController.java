package kr.co.wdchub.sellerdata.controller;

import kr.co.wdchub.sellerdata.dto.ProductDtos.ProductRequest;
import kr.co.wdchub.sellerdata.dto.ProductDtos.ProductResponse;
import kr.co.wdchub.sellerdata.dto.ProductDtos.BulkCreateResult;
import kr.co.wdchub.sellerdata.dto.ProductDtos.BulkCreateRowResult;
import kr.co.wdchub.sellerdata.dto.ProductDtos.BarcodeCheckResult;
import kr.co.wdchub.sellerdata.security.CustomUserDetails; // TODO: 실제 패키지 경로로 수정
import kr.co.wdchub.sellerdata.service.ProductService;
import kr.co.wdchub.sellerdata.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.ArrayList;
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
    private final ProductRepository productRepository;

    @GetMapping
    public String productManagementPage(@AuthenticationPrincipal CustomUserDetails userDetails, Model model) {
        model.addAttribute("companyName", userDetails.getMember().getCompanyName());
        return "admin/products"; // templates/admin/products.html
    }

    /** 등록 화면의 "등록확인" 버튼 — 이 바코드로 이미 등록된 상품이 있는지 확인합니다 */
    @GetMapping("/check-barcode")
    @ResponseBody
    public BarcodeCheckResult checkBarcode(@RequestParam String barcode) {
        return new BarcodeCheckResult(productRepository.existsByBarcode(barcode));
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

    /**
     * 엑셀 대량등록 — 프론트에서 엑셀 파일을 직접 읽어(SheetJS) 행마다 ProductRequest로 변환해서
     * 배열째로 보내줍니다. 이미지 파일은 포함하지 않고(엑셀에 이미지를 담기 어려우므로),
     * 텍스트/숫자/옵션 데이터만으로 상품을 만듭니다 — 이미지는 등록 후 각 상품을 수정하면서 올리면 됩니다.
     * 한 행이 실패해도(카테고리/브랜드명을 못 찾는 등) 나머지 행 등록은 계속 진행되고,
     * 행별로 성공/실패 결과를 모아서 돌려줍니다.
     */
    @PostMapping("/bulk")
    @ResponseBody
    public BulkCreateResult bulkCreate(@RequestBody List<ProductRequest> requests) {
        List<BulkCreateRowResult> rows = new ArrayList<>();
        int success = 0;
        int fail = 0;

        for (int i = 0; i < requests.size(); i++) {
            int excelRowNumber = i + 2; // 1행은 헤더이므로 데이터는 2행부터 시작
            ProductRequest req = requests.get(i);
            try {
                productService.createProduct(req, null, null);
                rows.add(new BulkCreateRowResult(excelRowNumber, req.productName(), true, "등록 완료"));
                success++;
            } catch (Exception e) {
                rows.add(new BulkCreateRowResult(excelRowNumber, req.productName(), false, e.getMessage()));
                fail++;
            }
        }

        return new BulkCreateResult(success, fail, rows);
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
