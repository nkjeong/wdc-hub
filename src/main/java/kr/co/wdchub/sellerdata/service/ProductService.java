package kr.co.wdchub.sellerdata.service;

import jakarta.transaction.Transactional;
import kr.co.wdchub.sellerdata.domain.*;
import kr.co.wdchub.sellerdata.dto.ProductDtos.ProductOptionRequest;
import kr.co.wdchub.sellerdata.dto.ProductDtos.ProductOptionResponse;
import kr.co.wdchub.sellerdata.dto.ProductDtos.ProductRequest;
import kr.co.wdchub.sellerdata.dto.ProductDtos.ProductResponse;
import kr.co.wdchub.sellerdata.repository.BrandRepository;
import kr.co.wdchub.sellerdata.repository.Category1Repository;
import kr.co.wdchub.sellerdata.repository.Category2Repository;
import kr.co.wdchub.sellerdata.repository.Category3Repository;
import kr.co.wdchub.sellerdata.repository.ProductOptionRepository;
import kr.co.wdchub.sellerdata.repository.ProductRepository;
import kr.co.wdchub.sellerdata.service.ProductImageService.MainImageUrls;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.time.format.DateTimeFormatter;
import java.util.List;

/** 상품 관리 서비스 — 관리자 전용 등록/수정/삭제 + 회원 공용 조회/응답 변환 */
@Service
@RequiredArgsConstructor
public class ProductService {

    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

    private final ProductRepository productRepository;
    private final ProductOptionRepository productOptionRepository;
    private final Category1Repository category1Repository;
    private final Category2Repository category2Repository;
    private final Category3Repository category3Repository;
    private final BrandRepository brandRepository;
    private final ProductImageService productImageService;

    public List<Product> getAllProducts() {
        return productRepository.findAllByOrderByCreatedAtDesc();
    }

    @Transactional
    public Product createProduct(ProductRequest req, MultipartFile mainImageFile, List<MultipartFile> detailImageFiles) {
        Product product = Product.builder()
                .stockOutYn(false)
                .discontinuedYn(false)
                .bundleYn(false)
                .importedYn(false)
                .newRegisteredYn(false)
                .newProductYn(false)
                .hasOptionYn(false)
                .build();
        applyRequest(product, req);
        applyImages(product, mainImageFile, detailImageFiles);
        Product saved = productRepository.save(product);
        applyOptions(saved, req);
        return saved;
    }

    @Transactional
    public void updateProduct(Long id, ProductRequest req, MultipartFile mainImageFile, List<MultipartFile> detailImageFiles) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 상품입니다. id=" + id));
        applyRequest(product, req);
        applyImages(product, mainImageFile, detailImageFiles);
        applyOptions(product, req);
    }

    @Transactional
    public void deleteProduct(Long id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 상품입니다. id=" + id));
        productOptionRepository.deleteAllByProduct_Id(id);
        productRepository.delete(product);
    }

    /** 엔티티 -> 응답 DTO 변환 (관리자용/회원용 조회 API가 공용으로 사용) */
    public ProductResponse toResponse(Product p) {
        List<ProductOptionResponse> options = productOptionRepository.findAllByProduct_IdOrderBySortOrderAsc(p.getId()).stream()
                .map(o -> new ProductOptionResponse(
                        o.getId(), o.getOptionCode(), o.getOptionName(), o.getOptionValue(),
                        o.getAdditionalPrice(), o.getStockQuantity(), o.getOptionBarcode(), o.getSoldOutYn()))
                .toList();

        return new ProductResponse(
                p.getId(),
                p.getBarcode(),
                p.getProductNumber(),
                p.getProductName(),
                p.getSpec(),
                p.getConsumerPrice(),
                p.getRecommendedPrice(),
                p.getUnit(),
                p.getUnitQuantity(),
                p.getPackQuantity(),
                p.getCategory1() != null ? p.getCategory1().getId() : null,
                p.getCategory1() != null ? p.getCategory1().getCategoryName() : null,
                p.getCategory2() != null ? p.getCategory2().getId() : null,
                p.getCategory2() != null ? p.getCategory2().getCategoryName() : null,
                p.getCategory3() != null ? p.getCategory3().getId() : null,
                p.getCategory3() != null ? p.getCategory3().getCategoryName() : null,
                p.getBrand() != null ? p.getBrand().getId() : null,
                p.getBrand() != null ? p.getBrand().getBrandNameKr() : null,
                p.getBrand() != null ? p.getBrand().getManufacturerName() : null,
                p.getBrand() != null ? p.getBrand().getImporterName() : null,
                p.getCountryOfOrigin(),
                p.getSellerPrice1(),
                p.getSellerPrice2(),
                p.getSellerPrice3(),
                p.getKeyword(),
                p.getMainImageThumbUrl(),
                p.getMainImageDetailUrl(),
                p.getMainImageMediumUrl(),
                p.getMainImageOriginalUrl(),
                p.getDetailImageUrls(),
                p.getDetailImageViewUrls(),
                p.getDescription(),
                p.getStockOutYn(),
                p.getDiscontinuedYn(),
                p.getBundleYn(),
                p.getImportedYn(),
                p.getNewRegisteredYn(),
                p.getNewProductYn(),
                p.getHasOptionYn(),
                options,
                p.getCreatedAt() != null ? p.getCreatedAt().format(DATE_FORMAT) : null,
                p.getUpdatedAt() != null ? p.getUpdatedAt().format(DATE_FORMAT) : null
        );
    }

    // ── 내부 헬퍼 ──────────────────────────────────

    private void applyRequest(Product product, ProductRequest req) {
        product.setBarcode(req.barcode());
        product.setProductNumber(req.productNumber());
        product.setProductName(req.productName());
        product.setSpec(req.spec());
        product.setConsumerPrice(req.consumerPrice());
        product.setRecommendedPrice(req.recommendedPrice());
        product.setUnit(req.unit());
        product.setUnitQuantity(req.unitQuantity());
        product.setPackQuantity(req.packQuantity());
        product.setCategory1(resolveCategory1(req.category1Id()));
        product.setCategory2(resolveCategory2(req.category2Id()));
        product.setCategory3(resolveCategory3(req.category3Id()));
        product.setBrand(resolveBrand(req.brandId()));
        product.setCountryOfOrigin(req.countryOfOrigin());
        product.setSellerPrice1(req.sellerPrice1());
        product.setSellerPrice2(req.sellerPrice2());
        product.setSellerPrice3(req.sellerPrice3());
        product.setKeyword(req.keyword());
        product.setDescription(req.description());
        if (req.stockOutYn() != null) product.setStockOutYn(req.stockOutYn());
        if (req.discontinuedYn() != null) product.setDiscontinuedYn(req.discontinuedYn());
        if (req.bundleYn() != null) product.setBundleYn(req.bundleYn());
        if (req.importedYn() != null) product.setImportedYn(req.importedYn());
        if (req.newRegisteredYn() != null) product.setNewRegisteredYn(req.newRegisteredYn());
        if (req.newProductYn() != null) product.setNewProductYn(req.newProductYn());
        product.setHasOptionYn(Boolean.TRUE.equals(req.hasOptionYn()));
    }

    /**
     * 새 파일이 왔을 때만 이미지를 교체합니다.
     * 수정 화면에서 이미지를 새로 선택하지 않으면 기존 이미지가 그대로 유지됩니다.
     */
    private void applyImages(Product product, MultipartFile mainImageFile, List<MultipartFile> detailImageFiles) {
        if (mainImageFile != null && !mainImageFile.isEmpty()) {
            MainImageUrls urls = productImageService.storeMainImage(mainImageFile);
            product.setMainImageThumbUrl(urls.thumbUrl());
            product.setMainImageDetailUrl(urls.detailViewUrl());
            product.setMainImageMediumUrl(urls.mediumUrl());
            product.setMainImageOriginalUrl(urls.originalUrl());
        }

        if (detailImageFiles != null && !detailImageFiles.isEmpty()) {
            ProductImageService.DetailImageUrls stored = productImageService.storeDetailImages(detailImageFiles);
            if (stored != null) {
                product.setDetailImageUrls(stored.originalUrls());
                product.setDetailImageViewUrls(stored.viewUrls());
            }
        }
    }

    /** 옵션은 저장할 때마다 기존 것을 전부 지우고 새로 등록합니다 (상세이미지 교체 방식과 동일) */
    private void applyOptions(Product product, ProductRequest req) {
        productOptionRepository.deleteAllByProduct_Id(product.getId());

        boolean hasOption = Boolean.TRUE.equals(req.hasOptionYn());
        if (!hasOption || req.options() == null || req.options().isEmpty()) return;

        int seq = 1;
        for (ProductOptionRequest optReq : req.options()) {
            if (optReq.optionName() == null || optReq.optionName().isBlank()
                    || optReq.optionValue() == null || optReq.optionValue().isBlank()) {
                continue; // 이름/값이 빈 옵션 행은 건너뜀
            }
            String code = "OPT-" + product.getId() + "-" + String.format("%03d", seq);
            ProductOption option = ProductOption.builder()
                    .optionCode(code)
                    .product(product)
                    .optionName(optReq.optionName())
                    .optionValue(optReq.optionValue())
                    .additionalPrice(optReq.additionalPrice() != null ? optReq.additionalPrice() : BigDecimal.ZERO)
                    .stockQuantity(optReq.stockQuantity())
                    .optionBarcode(optReq.optionBarcode())
                    .soldOutYn(optReq.soldOutYn() != null ? optReq.soldOutYn() : false)
                    .sortOrder(seq)
                    .useYn(true)
                    .build();
            productOptionRepository.save(option);
            seq++;
        }
    }

    private Category1 resolveCategory1(Long id) {
        if (id == null) return null;
        return category1Repository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 1차 카테고리입니다. id=" + id));
    }

    private Category2 resolveCategory2(Long id) {
        if (id == null) return null;
        return category2Repository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 2차 카테고리입니다. id=" + id));
    }

    private Category3 resolveCategory3(Long id) {
        if (id == null) return null;
        return category3Repository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 3차 카테고리입니다. id=" + id));
    }

    private Brand resolveBrand(Long id) {
        if (id == null) return null;
        return brandRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 브랜드입니다. id=" + id));
    }
}
