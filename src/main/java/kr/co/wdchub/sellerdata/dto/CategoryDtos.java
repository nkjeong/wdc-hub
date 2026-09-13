package kr.co.wdchub.sellerdata.dto;

import java.util.List;

/**
 * 카테고리 관리(관리자 전용) 요청/응답 DTO 모음
 * 엔티티를 그대로 JSON으로 내려주지 않기 위해 사용 (LAZY 로딩 문제 방지 + 필요한 필드만 노출)
 */
public class CategoryDtos {

    // ── 요청 ──────────────────────────────────────

    public record Category1CreateRequest(String categoryName) {}

    public record Category2CreateRequest(String categoryName, Long category1Id) {}

    public record Category3CreateRequest(String categoryName, Long category2Id) {}

    public record CategoryUpdateRequest(String categoryName, Integer sortOrder, Boolean useYn) {}

    // ── 응답 ──────────────────────────────────────

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

    /** 관리자 화면 초기 로딩용: 1차 카테고리 전체를 한 번에 내려줄 때 사용 */
    public record CategoryTreeResponse(
            List<Category1Response> category1List
    ) {}
}
