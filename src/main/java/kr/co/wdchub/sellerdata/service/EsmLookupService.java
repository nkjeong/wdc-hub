package kr.co.wdchub.sellerdata.service;

import kr.co.wdchub.sellerdata.domain.EsmCategory;
import kr.co.wdchub.sellerdata.domain.EsmOrigin;
import kr.co.wdchub.sellerdata.dto.EsmDtos.CategoryDetail;
import kr.co.wdchub.sellerdata.dto.EsmDtos.CategoryHit;
import kr.co.wdchub.sellerdata.dto.EsmDtos.NodeDto;
import kr.co.wdchub.sellerdata.dto.EsmDtos.OriginDto;
import kr.co.wdchub.sellerdata.dto.EsmDtos.SiteOption;
import kr.co.wdchub.sellerdata.repository.EsmCategoryRepository;
import kr.co.wdchub.sellerdata.repository.EsmOriginRepository;
import kr.co.wdchub.sellerdata.repository.EsmSiteCategoryRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * G마켓(ESM+) 카테고리/원산지 조회. 상품 등록 화면의 선택 상자가 사용합니다.
 * 카테고리는 최대 5단계이고, 실제로 고를 수 있는 것은 "마지막 단계"뿐입니다.
 */
@Service
@Transactional(readOnly = true)
public class EsmLookupService {

    private static final int SEARCH_LIMIT = 30;

    private final EsmCategoryRepository categoryRepository;
    private final EsmSiteCategoryRepository siteCategoryRepository;
    private final EsmOriginRepository originRepository;

    public EsmLookupService(EsmCategoryRepository categoryRepository,
                            EsmSiteCategoryRepository siteCategoryRepository,
                            EsmOriginRepository originRepository) {
        this.categoryRepository = categoryRepository;
        this.siteCategoryRepository = siteCategoryRepository;
        this.originRepository = originRepository;
    }

    /** parent가 비어 있으면 1차(대분류) 목록, 아니면 그 경로(예: "식품>신선식품") 바로 아래 단계 목록 */
    public List<NodeDto> children(String parent) {
        List<NodeDto> result = new ArrayList<>();
        String prefix = parent == null ? "" : parent.trim();

        if (prefix.isEmpty()) {
            for (String name : categoryRepository.usableLevel1()) {
                if (name != null) result.add(new NodeDto(name, false, null));
            }
            return result;
        }

        int depth = prefix.split(">").length;
        Map<String, NodeDto> byName = new LinkedHashMap<>();
        for (EsmCategory c : categoryRepository.usableUnder(prefix)) {
            String path = c.getNamePath();
            if (!path.startsWith(prefix + ">")) continue;   // 이름에 _ % 가 들어 있어도 정확히 이 경로 아래만
            String[] segs = path.split(">");
            if (segs.length <= depth) continue;
            String name = segs[depth];
            boolean leaf = segs.length == depth + 1;
            if (leaf) byName.put(name, new NodeDto(name, true, c.getEsmCode()));
            else byName.putIfAbsent(name, new NodeDto(name, false, null));
        }
        result.addAll(byName.values());
        return result;
    }

    /**
     * 이름으로 검색 (2글자 이상, 최대 30건).
     * 띄어쓰기로 나눈 모든 단어가 카테고리 경로에 들어 있는 것만 찾습니다. (AND 검색)
     * 예) "주방 텀블러" → 경로에 '주방'도 있고 '텀블러'도 있는 카테고리
     */
    public List<CategoryHit> search(String keyword) {
        String k = keyword == null ? "" : keyword.trim();
        if (k.length() < 2) return List.of();

        List<String> terms = Arrays.stream(k.toLowerCase().split("\\s+"))
                .filter(t -> !t.isEmpty())
                .distinct()
                .toList();
        // DB에는 가장 긴 단어로 먼저 좁혀 물어보고, 나머지 단어는 여기서 확인합니다
        String longest = terms.stream().max(Comparator.comparingInt(String::length)).orElse(k);

        return categoryRepository.searchUsableForGmarket(longest).stream()
                .filter(c -> {
                    String path = c.getNamePath().toLowerCase();
                    return terms.stream().allMatch(path::contains);
                })
                .limit(SEARCH_LIMIT)
                .map(c -> new CategoryHit(c.getEsmCode(), c.getNamePath()))
                .toList();
    }

    /** ESM 코드 하나의 경로와, 대응하는 G마켓 카테고리 목록 */
    public CategoryDetail detail(String esmCode) {
        EsmCategory c = categoryRepository.findById(esmCode)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 카테고리입니다: " + esmCode));
        List<SiteOption> options = siteCategoryRepository.findByEsmCodeAndSiteOrderBySiteCode(esmCode, "G").stream()
                .map(s -> new SiteOption(s.getSiteCode(), s.getSiteName()))
                .toList();
        return new CategoryDetail(c.getEsmCode(), c.getNamePath(), options);
    }

    /** 원산지 전체(523건). 국내 시/군/구가 먼저, 그다음 해외 */
    public List<OriginDto> origins() {
        return originRepository.findAll().stream()
                .sorted(Comparator.comparing((EsmOrigin o) -> "DOMESTIC".equals(o.getAreaType()) ? 0 : 1)
                        .thenComparing(EsmOrigin::getOriginName))
                .map(o -> new OriginDto(o.getOriginCode(), o.getOriginName(), o.getRegionType(), o.getAreaType()))
                .toList();
    }
}
