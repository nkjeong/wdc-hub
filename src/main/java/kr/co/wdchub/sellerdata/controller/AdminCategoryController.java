package kr.co.wdchub.sellerdata.controller;

import kr.co.wdchub.sellerdata.domain.Category1;
import kr.co.wdchub.sellerdata.domain.Category2;
import kr.co.wdchub.sellerdata.domain.Category3;
import kr.co.wdchub.sellerdata.dto.CategoryDtos.*;
import kr.co.wdchub.sellerdata.security.CustomUserDetails; // TODO: 실제 패키지 경로로 수정
import kr.co.wdchub.sellerdata.service.CategoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 카테고리(1~3차) 관리 — 관리자 전용
 * SecurityConfig에서 "/admin/**" 경로 전체가 hasRole('ADMIN')으로 이미 보호되지만,
 * 메서드 레벨에도 @PreAuthorize를 걸어 이중으로 방어합니다.
 */
@Controller
@RequiredArgsConstructor
@RequestMapping("/admin/categories")
@PreAuthorize("hasRole('ADMIN')")
public class AdminCategoryController {

    private final CategoryService categoryService;

    @GetMapping
    public String categoryManagementPage(@AuthenticationPrincipal CustomUserDetails userDetails, Model model) {
        model.addAttribute("companyName", userDetails.getMember().getCompanyName());
        return "admin/categories"; // templates/admin/categories.html
    }

    // ── 1차 카테고리 ──────────────────────────────

    @GetMapping("/category1")
    @ResponseBody
    public List<Category1Response> listCategory1() {
        return categoryService.getAllCategory1().stream()
                .map(c -> new Category1Response(c.getId(), c.getCategoryCode(), c.getCategoryName(), c.getSortOrder(), c.getUseYn()))
                .toList();
    }

    @PostMapping("/category1")
    @ResponseBody
    public Category1Response createCategory1(@RequestBody Category1CreateRequest req) {
        Category1 c = categoryService.createCategory1(req);
        return new Category1Response(c.getId(), c.getCategoryCode(), c.getCategoryName(), c.getSortOrder(), c.getUseYn());
    }

    @PutMapping("/category1/{id}")
    @ResponseBody
    public void updateCategory1(@PathVariable Long id, @RequestBody CategoryUpdateRequest req) {
        categoryService.updateCategory1(id, req);
    }

    @DeleteMapping("/category1/{id}")
    @ResponseBody
    public void deleteCategory1(@PathVariable Long id) {
        categoryService.deleteCategory1(id);
    }

    // ── 2차 카테고리 ──────────────────────────────

    @GetMapping("/category1/{category1Id}/category2")
    @ResponseBody
    public List<Category2Response> listCategory2(@PathVariable Long category1Id) {
        return categoryService.getCategory2ByParent(category1Id).stream()
                .map(c -> new Category2Response(c.getId(), c.getCategoryCode(), c.getCategoryName(),
                        c.getCategory1().getId(), c.getSortOrder(), c.getUseYn()))
                .toList();
    }

    @PostMapping("/category2")
    @ResponseBody
    public Category2Response createCategory2(@RequestBody Category2CreateRequest req) {
        Category2 c = categoryService.createCategory2(req);
        return new Category2Response(c.getId(), c.getCategoryCode(), c.getCategoryName(),
                c.getCategory1().getId(), c.getSortOrder(), c.getUseYn());
    }

    @PutMapping("/category2/{id}")
    @ResponseBody
    public void updateCategory2(@PathVariable Long id, @RequestBody CategoryUpdateRequest req) {
        categoryService.updateCategory2(id, req);
    }

    @DeleteMapping("/category2/{id}")
    @ResponseBody
    public void deleteCategory2(@PathVariable Long id) {
        categoryService.deleteCategory2(id);
    }

    // ── 3차 카테고리 ──────────────────────────────

    @GetMapping("/category2/{category2Id}/category3")
    @ResponseBody
    public List<Category3Response> listCategory3(@PathVariable Long category2Id) {
        return categoryService.getCategory3ByParent(category2Id).stream()
                .map(c -> new Category3Response(c.getId(), c.getCategoryCode(), c.getCategoryName(),
                        c.getCategory2().getId(), c.getCategory1().getId(), c.getSortOrder(), c.getUseYn()))
                .toList();
    }

    @PostMapping("/category3")
    @ResponseBody
    public Category3Response createCategory3(@RequestBody Category3CreateRequest req) {
        Category3 c = categoryService.createCategory3(req);
        return new Category3Response(c.getId(), c.getCategoryCode(), c.getCategoryName(),
                c.getCategory2().getId(), c.getCategory1().getId(), c.getSortOrder(), c.getUseYn());
    }

    @PutMapping("/category3/{id}")
    @ResponseBody
    public void updateCategory3(@PathVariable Long id, @RequestBody CategoryUpdateRequest req) {
        categoryService.updateCategory3(id, req);
    }

    @DeleteMapping("/category3/{id}")
    @ResponseBody
    public void deleteCategory3(@PathVariable Long id) {
        categoryService.deleteCategory3(id);
    }

    // ── 예외 처리 ──────────────────────────────
    // 삭제 시 "하위 카테고리가 있어 삭제 불가" 같은 메시지를 프론트(alert)에 그대로 보여주기 위함

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
