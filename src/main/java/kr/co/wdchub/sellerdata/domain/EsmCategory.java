package kr.co.wdchub.sellerdata.domain;

import jakarta.persistence.*;
import lombok.*;

/**
 * ESM+(G마켓·옥션 공용 판매관리) 카테고리. 상품 일괄등록 양식의 "카테고리 코드"(ESM 코드)에 들어가는 값입니다.
 * 코드는 0으로 시작하는 20자리라서 숫자가 아니라 반드시 문자열로 다룹니다.
 * 데이터는 esm_category_import.sql(카테고리목록.xls 기반)로 채웁니다.
 */
@Entity
@Table(name = "esm_category", indexes = {
        @Index(name = "idx_esm_category_top", columnList = "top_name"),
        @Index(name = "idx_esm_category_levels", columnList = "level1, level2, level3")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EsmCategory {

    /** ESM 카테고리 코드 (20자리, 예: 00030001000100010001) */
    @Id
    @Column(name = "esm_code", length = 20)
    private String esmCode;

    /** 분류 경로 (예: 식품>신선식품>농산물>과일>사과) */
    @Column(name = "name_path", nullable = false, length = 300)
    private String namePath;

    /** 분류 단계 수 (2~5) */
    @Column(name = "depth", nullable = false)
    private int depth;

    /** 최상위 분류 이름 (예: 식품) — level1과 같은 값 */
    @Column(name = "top_name", length = 100)
    private String topName;

    /**
     * 분류 경로를 단계별로 나눈 이름. 예) 식품 > 신선식품 > 농산물 > 과일 > 사과
     *   level1=식품, level2=신선식품, level3=농산물, level4=과일, level5=사과
     * 깊이(depth)가 2~5단계로 서로 달라서, 없는 단계는 null입니다.
     * G마켓에 실제로 쓰는 카테고리는 모두 "마지막 단계"라서, 회원은 마지막 단계의 카테고리를 고르게 됩니다.
     */
    @Column(name = "level1", length = 100)
    private String level1;

    @Column(name = "level2", length = 100)
    private String level2;

    @Column(name = "level3", length = 100)
    private String level3;

    @Column(name = "level4", length = 100)
    private String level4;

    @Column(name = "level5", length = 100)
    private String level5;
}
