package kr.co.wdchub.sellerdata.service;

import kr.co.wdchub.sellerdata.domain.Brand;
import kr.co.wdchub.sellerdata.domain.FeaturedBrand;
import kr.co.wdchub.sellerdata.repository.BrandRepository;
import kr.co.wdchub.sellerdata.repository.FeaturedBrandRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * 대시보드 "주요 브랜드" 영역 — 브랜드관리 목록에서 체크박스로 고른 순서 그대로 1~10위가 됩니다.
 * (드래그 정렬 없음: 다시 고르면 그 순서로 통째로 바뀝니다)
 */
@Service
@RequiredArgsConstructor
public class FeaturedBrandService {

    public static final int MAX_COUNT = 10;

    public record FeaturedBrandDto(Long brandId, String brandNameKr, String logoImageUrl, int sortOrder) {}

    private final FeaturedBrandRepository featuredBrandRepository;
    private final BrandRepository brandRepository;

    /** 대시보드에 실제로 보여줄 목록 (1~10위 순서, 삭제되었거나 중지된 브랜드는 자동으로 빠짐) */
    @Transactional(readOnly = true)
    public List<FeaturedBrandDto> getForDashboard() {
        List<FeaturedBrand> rows = featuredBrandRepository.findAllByOrderBySortOrderAsc();
        if (rows.isEmpty()) return List.of();

        Map<Long, Brand> brands = brandRepository.findAllById(rows.stream().map(FeaturedBrand::getBrandId).toList())
                .stream().collect(Collectors.toMap(Brand::getId, b -> b));

        List<FeaturedBrandDto> result = new ArrayList<>();
        for (FeaturedBrand row : rows) {
            Brand b = brands.get(row.getBrandId());
            if (b == null || !Boolean.TRUE.equals(b.getUseYn())) continue; // 삭제되거나 중지된 브랜드는 건너뜀
            result.add(new FeaturedBrandDto(b.getId(), b.getBrandNameKr(), b.getLogoImageUrl(), row.getSortOrder()));
        }
        return result;
    }

    /** 지금 선택된 브랜드 id 목록 (관리자 화면에서 체크 표시용, 순서대로) */
    @Transactional(readOnly = true)
    public List<Long> getSelectedBrandIds() {
        return featuredBrandRepository.findAllByOrderBySortOrderAsc().stream()
                .map(FeaturedBrand::getBrandId)
                .toList();
    }

    /**
     * 고른 순서 그대로 통째로 저장합니다 (기존 선택은 지우고 새로 저장).
     * @param brandIds 체크한 순서대로의 브랜드 id 목록
     */
    @Transactional
    public void replace(List<Long> brandIds) {
        List<Long> ids = brandIds == null ? List.of() : new ArrayList<>(new LinkedHashSet<>(brandIds)); // 중복 제거, 순서는 유지
        if (ids.size() > MAX_COUNT) {
            throw new IllegalArgumentException("주요 브랜드는 최대 " + MAX_COUNT + "개까지 선택할 수 있어요.");
        }
        if (!ids.isEmpty()) {
            long found = brandRepository.findAllById(ids).stream().count();
            if (found != ids.size()) {
                throw new IllegalArgumentException("존재하지 않는 브랜드가 포함되어 있어요.");
            }
        }

        featuredBrandRepository.deleteAll();
        featuredBrandRepository.flush(); // 유니크 제약(brand_id, sort_order) 충돌을 막기 위해 삭제를 먼저 반영

        List<FeaturedBrand> toSave = new ArrayList<>();
        int order = 1;
        for (Long id : ids) toSave.add(FeaturedBrand.builder().brandId(id).sortOrder(order++).build());
        featuredBrandRepository.saveAll(toSave);
    }
}
