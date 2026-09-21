package kr.co.wdchub.sellerdata.domain;

import jakarta.persistence.*;
import lombok.*;

/**
 * ESM+ 원산지 코드. 상품 일괄등록 양식의 "원산지 지역코드"(BC)에 들어가는 값입니다.
 * - 국내: 시/군/구 단위 (예: 강원/강릉시 = 5101, 제주/전체 = 6400)
 * - 해외: 국가 단위 (예: 중국 = 174, 프랑스 = 226), 그리고 '수입산'(240)
 * '대한민국' 전체에 해당하는 코드는 없어서, 국내산은 시/군/구(또는 '도/전체')를 골라야 합니다.
 * 데이터는 esm_origin_import.sql(원산지목록.xls 기반)로 채웁니다.
 */
@Entity
@Table(name = "esm_origin", indexes = {
        @Index(name = "idx_esm_origin_name", columnList = "origin_name"),
        @Index(name = "idx_esm_origin_area", columnList = "area_type, province")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EsmOrigin {

    /** 원산지 코드 (숫자지만 문자열로 다룹니다) */
    @Id
    @Column(name = "origin_code", length = 10)
    private String originCode;

    /** 표시 이름 (예: 강원/강릉시, 프랑스) */
    @Column(name = "origin_name", nullable = false, length = 60)
    private String originName;

    /** DOMESTIC(국내) / OVERSEAS(해외) */
    @Column(name = "area_type", nullable = false, length = 10)
    private String areaType;

    /** 양식의 '원산지 지역타입'에 넣을 값: 국내산 / 해외수입 */
    @Column(name = "region_type", nullable = false, length = 10)
    private String regionType;

    /** 국내인 경우 도/시 (예: 강원), 해외는 null */
    @Column(name = "province", length = 20)
    private String province;

    /** 국내인 경우 시/군/구 (예: 강릉시, '전체'), 해외는 null */
    @Column(name = "city", length = 40)
    private String city;
}
