package kr.co.wdchub.sellerdata.service;

import jakarta.transaction.Transactional;
import kr.co.wdchub.sellerdata.domain.Brand;
import kr.co.wdchub.sellerdata.domain.Category1;
import kr.co.wdchub.sellerdata.dto.BrandDtos.*;
import kr.co.wdchub.sellerdata.repository.BrandRepository;
import kr.co.wdchub.sellerdata.repository.Category1Repository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

/**
 * 브랜드(제조사/수입사) 관리 서비스 — 관리자 전용 기능
 * 브랜드 코드 자동 생성 규칙: BRD-001, BRD-002 ...
 */
@Service
@RequiredArgsConstructor
public class BrandService {

    private final BrandRepository brandRepository;
    private final Category1Repository category1Repository;
    private final SynologyUploadService synologyUploadService;

    // ── 조회 ──────────────────────────────────────

    public List<Brand> getAllBrands() {
        return brandRepository.findAllByOrderBySortOrderAsc();
    }

    /** 상품이 하나도 없어도 노출되는 "전체 브랜드 목록"용 — 사용중(useYn=true)인 브랜드만 */
    public List<Brand> getAllActiveBrands() {
        return brandRepository.findAllByUseYnTrueOrderBySortOrderAsc();
    }

    /** 엔티티 -> 응답 DTO 변환 (관리자용/회원용 조회 API가 공용으로 사용) */
    public BrandResponse toResponse(Brand b) {
        return new BrandResponse(
                b.getId(),
                b.getBrandCode(),
                b.getBrandNameKr(),
                b.getBrandNameEn(),
                b.getManufacturerName(),
                b.getImporterName(),
                b.getProductSummary(),
                b.getLogoImageUrl(),
                b.getCountryOfOrigin(),
                b.getImportType(),
                b.getCategory1() != null ? b.getCategory1().getId() : null,
                b.getCategory1() != null ? b.getCategory1().getCategoryName() : null,
                b.getSortOrder(),
                b.getUseYn()
        );
    }

    // ── 등록 ──────────────────────────────────────

    @Transactional
    public Brand createBrand(BrandCreateRequest req) {
        Category1 category1 = resolveCategory1(req.category1Id());

        long seq = brandRepository.count() + 1;
        String code = "BRD-" + String.format("%03d", seq);

        Brand brand = Brand.builder()
                .brandCode(code)
                .brandNameKr(req.brandNameKr())
                .brandNameEn(req.brandNameEn())
                .manufacturerName(req.manufacturerName())
                .importerName(req.importerName())
                .productSummary(req.productSummary())
                .countryOfOrigin(req.countryOfOrigin())
                .importType(req.importType())
                .category1(category1)
                .sortOrder((int) seq)
                .useYn(true)
                .build();

        return brandRepository.save(brand);
    }

    // ── 수정 ──────────────────────────────────────

    @Transactional
    public void updateBrand(Long id, BrandUpdateRequest req) {
        Brand brand = brandRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 브랜드입니다. id=" + id));

        if (req.brandNameKr() != null) brand.setBrandNameKr(req.brandNameKr());
        if (req.brandNameEn() != null) brand.setBrandNameEn(req.brandNameEn());
        if (req.manufacturerName() != null) brand.setManufacturerName(req.manufacturerName());
        if (req.importerName() != null) brand.setImporterName(req.importerName());
        if (req.productSummary() != null) brand.setProductSummary(req.productSummary());
        if (req.countryOfOrigin() != null) brand.setCountryOfOrigin(req.countryOfOrigin());
        if (req.importType() != null) brand.setImportType(req.importType());
        if (req.category1Id() != null) brand.setCategory1(resolveCategory1(req.category1Id()));
        if (req.sortOrder() != null) brand.setSortOrder(req.sortOrder());
        if (req.useYn() != null) brand.setUseYn(req.useYn());
    }

    // ── 로고 이미지 (시놀로지 NAS 저장) ─────────────
    // 브랜드를 먼저 등록한 뒤에만 로고를 올릴 수 있습니다 (등록 전에는 저장할 브랜드 id가 없어서).

    private static final long MAX_LOGO_BYTES = 5L * 1024 * 1024;

    @Transactional
    public Brand updateLogo(Long id, MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("로고 이미지 파일을 선택해 주세요.");
        }
        if (file.getSize() > MAX_LOGO_BYTES) {
            throw new IllegalArgumentException("로고 이미지는 5MB 이하만 올릴 수 있어요.");
        }
        Brand brand = brandRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 브랜드입니다. id=" + id));

        String oldUrl = brand.getLogoImageUrl();
        String newUrl = synologyUploadService.upload(file); // 실패하면 예외가 나면서 아래 코드가 실행되지 않아 기존 로고가 유지됩니다
        brand.setLogoImageUrl(newUrl);

        if (oldUrl != null && !oldUrl.isBlank()) {
            synologyUploadService.delete(oldUrl); // 새 로고 저장이 끝난 뒤에 옛 파일을 지웁니다
        }
        return brand;
    }

    @Transactional
    public void removeLogo(Long id) {
        Brand brand = brandRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 브랜드입니다. id=" + id));
        String oldUrl = brand.getLogoImageUrl();
        brand.setLogoImageUrl(null);
        if (oldUrl != null && !oldUrl.isBlank()) {
            synologyUploadService.delete(oldUrl);
        }
    }

    // ── 삭제(실제 삭제) ────────────────────────
    // 참고: 나중에 Product가 브랜드를 참조하게 되면, 참조 중인 상품이 있는지도 함께 체크해야 합니다.

    @Transactional
    public void deleteBrand(Long id) {
        Brand brand = brandRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 브랜드입니다. id=" + id));
        String logoUrl = brand.getLogoImageUrl();
        brandRepository.delete(brand);
        if (logoUrl != null && !logoUrl.isBlank()) {
            synologyUploadService.delete(logoUrl); // 브랜드 삭제가 끝난 뒤 NAS의 로고 파일도 지웁니다
        }
    }

    // ── 내부 헬퍼 ──────────────────────────────────

    private Category1 resolveCategory1(Long category1Id) {
        if (category1Id == null) return null;
        return category1Repository.findById(category1Id)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 카테고리입니다. id=" + category1Id));
    }
}
