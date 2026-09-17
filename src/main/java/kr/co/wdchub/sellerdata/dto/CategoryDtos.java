package kr.co.wdchub.sellerdata.dto;

import java.util.List;

/**
 * 카테고리 관련 요청/응답 DTO 모음
 * 엔티티를 그대로 JSON으로 내려주지 않기 위해 사용 (LAZY 로딩 문제 방지 + 필요한 필드만 노출)
 */
public class CategoryDtos {

    // ── 관리자 CRUD 요청 ──────────────────────────

    public record Category1CreateRequest(String categoryName) {}

    public record Category2CreateRequest(String categoryName, Long category1Id) {}

    public record Category3CreateRequest(String categoryName, Long category2Id) {}

    public record CategoryUpdateRequest(String categoryName, Integer sortOrder, Boolean useYn) {}

    // ── 관리자 CRUD 응답 (평면 구조) ────────────────

    public record Category1Response(
            Long id,
            String categoryCode,
            String categoryName,
            Integer sortOrder,
            Boolean useYn
    ) {}

    public record Category2Response(
            Long id,
            String categoryCode,
            String categoryName,
            Long category1Id,
            Integer sortOrder,
            Boolean useYn
    ) {}

    public record Category3Response(
            Long id,
            String categoryCode,
            String categoryName,
            Long category2Id,
            Long category1Id,
            Integer sortOrder,
            Boolean useYn
    ) {}

    // ── 전체 회원용 메가메뉴 응답 (중첩 트리 구조, useYn=true만 포함) ────

    public record Category1MenuResponse(
            Long id,
            String categoryCode,
            String categoryName,
            List<Category2MenuResponse> children
    ) {}

    public record Category2MenuResponse(
            Long id,
            String categoryCode,
            String categoryName,
            List<Category3MenuResponse> children
    ) {}

    public record Category3MenuResponse(
            Long id,
            String categoryCode,
            String categoryName
    ) {}
}
