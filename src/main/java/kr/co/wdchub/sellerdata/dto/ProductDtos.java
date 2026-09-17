package kr.co.wdchub.sellerdata.dto;

import java.math.BigDecimal;
import java.util.List;

public class ProductDtos {

    public record ProductOptionRequest(
            String optionName,
            String optionValue,
            BigDecimal additionalPrice,
            Integer stockQuantity,
            String optionBarcode,
            Boolean soldOutYn
    ) {}

    public record ProductOptionResponse(
            Long id,
            String optionCode,
            String optionName,
            String optionValue,
            BigDecimal additionalPrice,
            Integer stockQuantity,
            String optionBarcode,
            Boolean soldOutYn
    ) {}

    /**
     * 등록/수정 공용 요청 — 텍스트/숫자 필드만 담습니다.
     * 이미지는 별도의 파일 파트(mainImageFile, detailImageFiles)로 함께 전송되며,
     * Controller에서 multipart/form-data로 "data"라는 이름의 JSON 파트로 이 레코드를 받습니다.
     * 옵션(options)은 저장할 때마다 기존 것을 지우고 통째로 다시 등록합니다 (상세이미지 교체 방식과 동일).
     */
    public record ProductRequest(
            String barcode,
            String productNumber,
            String productName,
            String spec,
            BigDecimal consumerPrice,
            BigDecimal recommendedPrice,
            String unit,
            Integer unitQuantity,
            Integer packQuantity,
            Long category1Id,
            Long category2Id,
            Long category3Id,
            Long brandId,
            String countryOfOrigin,
            BigDecimal sellerPrice1,
            BigDecimal sellerPrice2,
            BigDecimal sellerPrice3,
            String keyword,
            String description,
            Boolean stockOutYn,
            Boolean discontinuedYn,
            Boolean bundleYn,
            Boolean importedYn,
            Boolean newRegisteredYn,
            Boolean newProductYn,
            Boolean hasOptionYn,
            List<ProductOptionRequest> options
    ) {}

    public record ProductResponse(
            Long id,
            String barcode,
            String productNumber,
            String productName,
            String spec,
            BigDecimal consumerPrice,
            BigDecimal recommendedPrice,
            String unit,
            Integer unitQuantity,
            Integer packQuantity,
            Long category1Id,
            String category1Name,
            Long category2Id,
            String category2Name,
            Long category3Id,
            String category3Name,
            Long brandId,
            String brandName,
            String manufacturerName,
            String importerName,
            String countryOfOrigin,
            BigDecimal sellerPrice1,
            BigDecimal sellerPrice2,
            BigDecimal sellerPrice3,
            String keyword,
            String mainImageThumbUrl,
            String mainImageDetailUrl,
            String mainImageMediumUrl,
            String mainImageOriginalUrl,
            String detailImageUrls,
            String detailImageViewUrls,
            String description,
            Boolean stockOutYn,
            Boolean discontinuedYn,
            Boolean bundleYn,
            Boolean importedYn,
            Boolean newRegisteredYn,
            Boolean newProductYn,
            Boolean hasOptionYn,
            List<ProductOptionResponse> options,
            String createdAt,
            String updatedAt
    ) {}
}
