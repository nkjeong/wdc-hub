package kr.co.wdchub.sellerdata.service;

import jakarta.transaction.Transactional;
import kr.co.wdchub.sellerdata.domain.Category1;
import kr.co.wdchub.sellerdata.domain.Category2;
import kr.co.wdchub.sellerdata.domain.Category3;
import kr.co.wdchub.sellerdata.dto.CategoryDtos.*;
import kr.co.wdchub.sellerdata.repository.Category1Repository;
import kr.co.wdchub.sellerdata.repository.Category2Repository;
import kr.co.wdchub.sellerdata.repository.Category3Repository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * 카테고리(1~3차) 관리 서비스 — 관리자 전용 기능
 *
 * 카테고리 코드 규칙 (자동 생성):
 *  1차: CTG1-001
 *  2차: CTG2-001-001   (앞 001 = 소속 1차 순번, 뒤 001 = 해당 1차 하위에서의 순번)
 *  3차: CTG3-001-001-001
 *
 * 삭제 정책: 실제 삭제(하드 딜리트). 하위 카테고리가 남아있으면 삭제를 막습니다.
 * (추후 Product 등 다른 테이블이 카테고리를 참조하게 되면, 참조 여부도 함께 체크해야 합니다.)
 */
@Service
@RequiredArgsConstructor
public class CategoryService {

    private final Category1Repository category1Repository;
    private final Category2Repository category2Repository;
    private final Category3Repository category3Repository;

    // ── 조회 ──────────────────────────────────────

    public List<Category1> getAllCategory1() {
        return category1Repository.findAllByOrderBySortOrderAsc();
    }

    public List<Category2> getCategory2ByParent(Long category1Id) {
        return category2Repository.findAllByCategory1_IdOrderBySortOrderAsc(category1Id);
    }

    public List<Category3> getCategory3ByParent(Long category2Id) {
        return category3Repository.findAllByCategory2_IdOrderBySortOrderAsc(category2Id);
    }

    // ── 등록 ──────────────────────────────────────

    @Transactional
    public Category1 createCategory1(Category1CreateRequest req) {
        long seq = category1Repository.count() + 1;
        String code = "CTG1-" + pad(seq);

        Category1 category1 = Category1.builder()
                .categoryCode(code)
                .categoryName(req.categoryName())
                .sortOrder((int) seq)
                .useYn(true)
                .build();

        return category1Repository.save(category1);
    }

    @Transactional
    public Category2 createCategory2(Category2CreateRequest req) {
        Category1 parent = category1Repository.findById(req.category1Id())
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 최상위 카테고리입니다. id=" + req.category1Id()));

        long siblingSeq = category2Repository.findAllByCategory1_IdOrderBySortOrderAsc(parent.getId()).size() + 1;
        String parentSuffix = extractLastSegment(parent.getCategoryCode()); // "CTG1-001" -> "001"
        String code = "CTG2-" + parentSuffix + "-" + pad(siblingSeq);

        Category2 category2 = Category2.builder()
                .categoryCode(code)
                .categoryName(req.categoryName())
                .category1(parent)
                .sortOrder((int) siblingSeq)
                .useYn(true)
                .build();

        return category2Repository.save(category2);
    }

    @Transactional
    public Category3 createCategory3(Category3CreateRequest req) {
        Category2 parent = category2Repository.findById(req.category2Id())
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 중간 카테고리입니다. id=" + req.category2Id()));

        long siblingSeq = category3Repository.findAllByCategory2_IdOrderBySortOrderAsc(parent.getId()).size() + 1;
        // "CTG2-001-001" -> "001-001"
        String parentSuffix = parent.getCategoryCode().replace("CTG2-", "");
        String code = "CTG3-" + parentSuffix + "-" + pad(siblingSeq);

        Category3 category3 = Category3.builder()
                .categoryCode(code)
                .categoryName(req.categoryName())
                .category2(parent)
                .category1(parent.getCategory1()) // 비정규화 컬럼 채움
                .sortOrder((int) siblingSeq)
                .useYn(true)
                .build();

        return category3Repository.save(category3);
    }

    // ── 수정 ──────────────────────────────────────

    @Transactional
    public void updateCategory1(Long id, CategoryUpdateRequest req) {
        Category1 category1 = category1Repository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 카테고리입니다. id=" + id));
        applyUpdate(req, category1::setCategoryName, category1::setSortOrder, category1::setUseYn);
    }

    @Transactional
    public void updateCategory2(Long id, CategoryUpdateRequest req) {
        Category2 category2 = category2Repository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 카테고리입니다. id=" + id));
        applyUpdate(req, category2::setCategoryName, category2::setSortOrder, category2::setUseYn);
    }

    @Transactional
    public void updateCategory3(Long id, CategoryUpdateRequest req) {
        Category3 category3 = category3Repository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 카테고리입니다. id=" + id));
        applyUpdate(req, category3::setCategoryName, category3::setSortOrder, category3::setUseYn);
    }

    // ── 삭제(실제 삭제) ────────────────────────
    // 하위 카테고리가 남아있으면 삭제 불가 — 데이터 정합성 보호

    @Transactional
    public void deleteCategory1(Long id) {
        if (!category2Repository.findAllByCategory1_IdOrderBySortOrderAsc(id).isEmpty()) {
            throw new IllegalStateException("하위 2차 카테고리가 존재하여 삭제할 수 없습니다. 하위 카테고리를 먼저 삭제해주세요.");
        }
        Category1 category1 = category1Repository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 카테고리입니다. id=" + id));
        category1Repository.delete(category1);
    }

    @Transactional
    public void deleteCategory2(Long id) {
        if (!category3Repository.findAllByCategory2_IdOrderBySortOrderAsc(id).isEmpty()) {
            throw new IllegalStateException("하위 3차 카테고리가 존재하여 삭제할 수 없습니다. 하위 카테고리를 먼저 삭제해주세요.");
        }
        Category2 category2 = category2Repository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 카테고리입니다. id=" + id));
        category2Repository.delete(category2);
    }

    @Transactional
    public void deleteCategory3(Long id) {
        Category3 category3 = category3Repository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 카테고리입니다. id=" + id));
        category3Repository.delete(category3);
    }

    // ── 내부 헬퍼 ──────────────────────────────────

    private void applyUpdate(CategoryUpdateRequest req,
                              java.util.function.Consumer<String> nameSetter,
                              java.util.function.Consumer<Integer> sortSetter,
                              java.util.function.Consumer<Boolean> useYnSetter) {
        if (req.categoryName() != null) nameSetter.accept(req.categoryName());
        if (req.sortOrder() != null) sortSetter.accept(req.sortOrder());
        if (req.useYn() != null) useYnSetter.accept(req.useYn());
    }

    private String pad(long seq) {
        return String.format("%03d", seq);
    }

    private String extractLastSegment(String code) {
        String[] parts = code.split("-");
        return parts[parts.length - 1];
    }
}
