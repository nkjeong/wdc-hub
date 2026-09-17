package kr.co.wdchub.sellerdata.controller;

import kr.co.wdchub.sellerdata.dto.CategoryDtos.Category1MenuResponse;
import kr.co.wdchub.sellerdata.service.CategoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 카테고리 전체보기 메가메뉴 API — 로그인한 모든 회원(셀러+관리자) 접근 가능
 * (관리자 전용 등록/수정/삭제는 AdminCategoryController "/admin/categories"를 사용합니다)
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/categories")
public class CategoryMenuController {

    private final CategoryService categoryService;

    /** 활성화된 카테고리만 1~3차 중첩 트리로 반환 */
    @GetMapping("/menu")
    public List<Category1MenuResponse> getCategoryMenu() {
        return categoryService.getCategoryMenuTree();
    }
}
