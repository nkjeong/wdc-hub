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
import kr.co.wdchub.sellerdata.repository.EsmCategoryRepository;
import kr.co.wdchub.sellerdata.repository.EsmOriginRepository;
import kr.co.wdchub.sellerdata.repository.EsmSiteCategoryRepository;
import kr.co.wdchub.sellerdata.repository.ProductOptionRepository;
import kr.co.wdchub.sellerdata.repository.ProductRepository;
import kr.co.wdchub.sellerdata.service.ProductImageService.MainImageUrls;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.math.BigDecimal;
import java.time.format.DateTimeFormatter;
import java.util.Arrays;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

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
    private final EsmCategoryRepository esmCategoryRepository;
    private final EsmSiteCategoryRepository esmSiteCategoryRepository;
    private final EsmOriginRepository esmOriginRepository;

    /** 양식의 '원산지 상품타입' 칸에 들어갈 수 있는 값 */
    private static final Set<String> ORIGIN_PRODUCT_TYPES = Set.of("농산물", "수산물", "가공식품", "해당없음", "상세설명표기");

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

        // DB 레코드를 지우기 전에, 서버 디스크에 남아있는 실제 이미지 파일들도 함께 지웁니다.
        productImageService.deleteFiles(
                product.getMainImageThumbUrl(),
                product.getMainImageDetailUrl(),
                product.getMainImageMediumUrl(),
                product.getMainImageOriginalUrl()
        );
        productImageService.deleteFileList(product.getDetailImageUrls());
        productImageService.deleteFileList(product.getDetailImageViewUrls());

        // 옵션(자식) 먼저 지우고 DB에 반영한 뒤, 상품(부모)을 지웁니다.
        productOptionRepository.deleteAllByProduct_Id(id);
        productOptionRepository.flush();
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
                p.getEsmCategoryCode(),
                p.getGmarketCategoryCode(),
                p.getOriginProductType(),
                p.getOriginCode(),
                p.getCertification(),
                p.getSellerPrice1(),
                p.getSellerPrice2(),
                p.getSellerPrice3(),
                p.getKeyword(),
                toAbsoluteUrl(p.getMainImageThumbUrl()),
                toAbsoluteUrl(p.getMainImageDetailUrl()),
                toAbsoluteUrl(p.getMainImageMediumUrl()),
                toAbsoluteUrl(p.getMainImageOriginalUrl()),
                toAbsoluteUrlList(p.getDetailImageUrls()),
                toAbsoluteUrlList(p.getDetailImageViewUrls()),
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

    /**
     * G마켓 카테고리/원산지(선택)를 검사해서 상품에 반영합니다.
     * 코드가 실제로 존재하는지, G마켓 세부 카테고리가 그 ESM 카테고리에 속한 것인지 확인해서
     * 나중에 G마켓 양식을 내려받을 때 잘못된 코드가 들어가는 일을 막습니다.
     */
    private void applyGmarketInfo(Product product, ProductRequest req) {
        // 카테고리
        String esmCode = blankToNull(req.esmCategoryCode());
        if (esmCode == null) {
            product.setEsmCategoryCode(null);
            product.setGmarketCategoryCode(null);
        } else {
            if (!esmCategoryRepository.existsById(esmCode)) {
                throw new IllegalArgumentException("존재하지 않는 G마켓 카테고리입니다: " + esmCode);
            }
            List<EsmSiteCategory> gOptions = esmSiteCategoryRepository.findByEsmCodeAndSiteOrderBySiteCode(esmCode, "G");
            if (gOptions.isEmpty()) {
                throw new IllegalArgumentException("선택한 카테고리는 G마켓에 대응하는 코드가 없어요. 다른 카테고리를 골라 주세요.");
            }
            String gCode = blankToNull(req.gmarketCategoryCode());
            if (gCode == null) {
                if (gOptions.size() > 1) {
                    throw new IllegalArgumentException("G마켓 세부 카테고리를 선택해 주세요. 이 카테고리는 G마켓에 세부 카테고리가 여러 개 있어요.");
                }
                gCode = gOptions.get(0).getSiteCode();
            } else {
                final String chosen = gCode;
                if (gOptions.stream().noneMatch(o -> o.getSiteCode().equals(chosen))) {
                    throw new IllegalArgumentException("선택한 G마켓 세부 카테고리가 이 카테고리에 속하지 않아요.");
                }
            }
            product.setEsmCategoryCode(esmCode);
            product.setGmarketCategoryCode(gCode);
        }

        // 원산지
        String originCode = blankToNull(req.originCode());
        String originType = blankToNull(req.originProductType());
        if (originType != null && !ORIGIN_PRODUCT_TYPES.contains(originType)) {
            throw new IllegalArgumentException("원산지 상품타입 값이 올바르지 않아요: " + originType);
        }
        if (originCode != null) {
            if (!esmOriginRepository.existsById(originCode)) {
                throw new IllegalArgumentException("존재하지 않는 G마켓 원산지 코드입니다: " + originCode);
            }
            if (originType == null) {
                throw new IllegalArgumentException("G마켓 원산지를 선택했다면 원산지 상품타입도 함께 선택해 주세요.");
            }
        }
        product.setOriginCode(originCode);
        product.setOriginProductType(originType);
    }

    private String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }

    private void applyRequest(Product product, ProductRequest req) {
        if (req.barcode() == null || req.barcode().isBlank()) {
            throw new IllegalArgumentException("바코드는 필수 항목입니다.");
        }
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
        applyGmarketInfo(product, req);
        // 프론트에서 항상 "해당사항없음" 또는 입력값을 보내주지만, 혹시 비어오는 경우(대량등록 등)를 대비한 기본값입니다.
        product.setCertification(req.certification() != null && !req.certification().isBlank() ? req.certification() : "해당사항없음");
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
            // 새 대표이미지를 저장하기 전에, 기존에 있던 4개 파일 경로를 먼저 기억해둡니다 (수정 시 교체되는 경우).
            String oldThumb = product.getMainImageThumbUrl();
            String oldDetailView = product.getMainImageDetailUrl();
            String oldMedium = product.getMainImageMediumUrl();
            String oldOriginal = product.getMainImageOriginalUrl();

            MainImageUrls urls = productImageService.storeMainImage(mainImageFile);
            product.setMainImageThumbUrl(urls.thumbUrl());
            product.setMainImageDetailUrl(urls.detailViewUrl());
            product.setMainImageMediumUrl(urls.mediumUrl());
            product.setMainImageOriginalUrl(urls.originalUrl());

            // 새 파일 저장이 끝난 뒤에 옛날 파일을 지웁니다 (등록 시에는 old 값이 전부 null이라 자연히 아무 일도 안 함).
            productImageService.deleteFiles(oldThumb, oldDetailView, oldMedium, oldOriginal);
        }

        if (detailImageFiles != null && !detailImageFiles.isEmpty()) {
            // 상세이미지도 마찬가지로, 새로 올리면 기존 목록 전체가 교체되는 방식이라 옛 파일들을 기억해뒀다가 지웁니다.
            String oldDetailUrls = product.getDetailImageUrls();
            String oldDetailViewUrls = product.getDetailImageViewUrls();

            ProductImageService.DetailImageUrls stored = productImageService.storeDetailImages(detailImageFiles);
            if (stored != null) {
                product.setDetailImageUrls(stored.originalUrls());
                product.setDetailImageViewUrls(stored.viewUrls());

                productImageService.deleteFileList(oldDetailUrls);
                productImageService.deleteFileList(oldDetailViewUrls);
            }
        }
    }

    /** 옵션은 저장할 때마다 기존 것을 전부 지우고 새로 등록합니다 (상세이미지 교체 방식과 동일) */
    private void applyOptions(Product product, ProductRequest req) {
        productOptionRepository.deleteAllByProduct_Id(product.getId());
        // 삭제를 DB에 먼저 반영합니다. flush 없이 바로 같은 옵션코드(OPT-상품id-순번)를 insert하면
        // Hibernate가 insert를 delete보다 먼저 실행해서 option_code 유니크 키 중복 오류가 납니다.
        productOptionRepository.flush();

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

    /**
     * "uploads/product-images/xxx.jpg" 같은 상대경로를 현재 요청의 스킴/도메인/포트 기준
     * 절대 URL(예: http://localhost:8080/uploads/product-images/xxx.jpg)로 바꿔줍니다.
     * 배포 후 실제 도메인으로 접속해도 코드 수정 없이 그 도메인이 그대로 들어갑니다.
     * (리버스 프록시 뒤에 있다면 X-Forwarded-* 헤더를 스프링이 자동으로 고려합니다.)
     */
    private String toAbsoluteUrl(String relativePath) {
        if (relativePath == null || relativePath.isBlank()) return null;
        // 시놀로지 등 외부 파일 서버가 이미 완전한 URL을 돌려준 경우엔 그대로 씁니다 (다시 조합하면 깨짐).
        if (relativePath.startsWith("http://") || relativePath.startsWith("https://")) return relativePath;
        String path = relativePath.startsWith("/") ? relativePath : "/" + relativePath;
        return ServletUriComponentsBuilder.fromCurrentContextPath()
                .path(path)
                .toUriString();
    }

    /** 줄바꿈으로 여러 경로가 이어진 문자열(상세이미지 목록 등)을 한 줄씩 절대 URL로 바꿔서 다시 합칩니다 */
    private String toAbsoluteUrlList(String newlineSeparatedPaths) {
        if (newlineSeparatedPaths == null || newlineSeparatedPaths.isBlank()) return null;
        return Arrays.stream(newlineSeparatedPaths.split("\n"))
                .map(this::toAbsoluteUrl)
                .collect(Collectors.joining("\n"));
    }
}
