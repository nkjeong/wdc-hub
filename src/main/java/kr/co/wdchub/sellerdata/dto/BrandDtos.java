package kr.co.wdchub.sellerdata.dto;

import kr.co.wdchub.sellerdata.domain.ImportType;

public class BrandDtos {

    // ── 요청 ──────────────────────────────────────

    public record BrandCreateRequest(
            String brandNameKr,
            String brandNameEn,
            String manufacturerName,
            String importerName,
            String productSummary,
            String countryOfOrigin,
            ImportType importType,
            Long category1Id
    ) {}

    public record BrandUpdateRequest(
            String brandNameKr,
            String brandNameEn,
            String manufacturerName,
            String importerName,
            String productSummary,
            String countryOfOrigin,
            ImportType importType,
            Long category1Id,
            Integer sortOrder,
            Boolean useYn
    ) {}

    // ── 응답 ──────────────────────────────────────

    public record BrandResponse(
            Long id,
            String brandCode,
            String brandNameKr,
            String brandNameEn,
            String manufacturerName,
            String importerName,
            String productSummary,
            String logoImageUrl,
            String countryOfOrigin,
            ImportType importType,
            Long category1Id,
            String category1Name,
            Integer sortOrder,
            Boolean useYn
    ) {}
}
