package kr.co.wdchub.sellerdata.controller;

import kr.co.wdchub.sellerdata.dto.ProductDtos.ProductResponse;
import kr.co.wdchub.sellerdata.security.CustomUserDetails; // TODO: 실제 패키지 경로로 수정
import kr.co.wdchub.sellerdata.service.ProductService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseBody;

import java.util.List;

/**
 * 상품 조회 — 로그인한 모든 회원(셀러+관리자) 접근 가능
 * - GET /products         : 전체 상품 목록 화면 (검색/필터/페이징은 클라이언트에서 처리)
 * - GET /products/list    : 대시보드·목록 화면이 함께 쓰는 JSON API
 * 등록/수정/삭제는 AdminProductController("/admin/products")를 사용하세요.
 */
@Controller
@RequiredArgsConstructor
@RequestMapping("/products")
public class ProductCatalogController {

    private final ProductService productService;

    @GetMapping
    public String productListPage(@AuthenticationPrincipal CustomUserDetails userDetails, Model model) {
        model.addAttribute("companyName", userDetails.getMember().getCompanyName());
        // 화면에서 회원 등급별로 판매가1~3 중 하나만 골라 보여주기 위한 값입니다.
        model.addAttribute("memberGrade", userDetails.getMember().getGrade().name());
        return "products-list"; // templates/products-list.html
    }

    @GetMapping("/by-brand")
    public String productsByBrandPage(@AuthenticationPrincipal CustomUserDetails userDetails, Model model) {
        model.addAttribute("companyName", userDetails.getMember().getCompanyName());
        model.addAttribute("memberGrade", userDetails.getMember().getGrade().name());
        return "products-by-brand"; // templates/products-by-brand.html
    }

    @GetMapping("/by-category")
    public String productsByCategoryPage(@AuthenticationPrincipal CustomUserDetails userDetails, Model model) {
        model.addAttribute("companyName", userDetails.getMember().getCompanyName());
        model.addAttribute("memberGrade", userDetails.getMember().getGrade().name());
        return "products-by-category"; // templates/products-by-category.html
    }

    @GetMapping("/list")
    @ResponseBody
    public List<ProductResponse> listProducts() {
        return productService.getAllProducts().stream()
                .map(productService::toResponse)
                .toList();
    }
}
