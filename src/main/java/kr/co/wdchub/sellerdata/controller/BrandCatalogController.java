package kr.co.wdchub.sellerdata.controller;

import kr.co.wdchub.sellerdata.dto.BrandDtos.BrandResponse;
import kr.co.wdchub.sellerdata.service.BrandService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 브랜드 조회 — 로그인한 모든 회원(셀러+관리자) 접근 가능
 * "브랜드별 상품" 페이지의 브랜드 목록(칩)에서 사용합니다.
 * 상품이 0개인 브랜드도 포함해서 전체 브랜드를 보여주기 위한 용도입니다
 * (상품 데이터에서 브랜드를 역으로 추출하면 상품 없는 브랜드가 누락되는 문제가 있었습니다).
 * 등록/수정/삭제는 AdminBrandController("/admin/brands")를 사용하세요.
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/brands")
public class BrandCatalogController {

    private final BrandService brandService;

    @GetMapping("/list")
    public List<BrandResponse> listBrands() {
        return brandService.getAllActiveBrands().stream()
                .map(brandService::toResponse)
                .toList();
    }
}
