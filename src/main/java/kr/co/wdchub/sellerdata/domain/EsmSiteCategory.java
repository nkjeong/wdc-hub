package kr.co.wdchub.sellerdata.domain;

import jakarta.persistence.*;
import lombok.*;

/**
 * ESM 카테고리에 대응하는 사이트별(옥션/G마켓) 카테고리 코드.
 * - site = "A": 옥션 (코드 8자리) → 양식의 'A 노출코드'
 * - site = "G": G마켓 (코드 27자리) → 양식의 'G 노출코드'
 * ESM 카테고리 하나에 G마켓 코드가 여러 개 붙는 경우가 있어서(약 600개) 행이 여러 개일 수 있습니다.
 * 행이 하나도 없는 ESM 카테고리(약 1,190개)는 사이트 대응이 없어 등록에 쓸 수 없습니다.
 */
@Entity
@Table(name = "esm_site_category", indexes = @Index(name = "idx_esm_site_esm", columnList = "esm_code, site"))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EsmSiteCategory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "esm_code", nullable = false, length = 20)
    private String esmCode;

    /** "A"(옥션) 또는 "G"(G마켓) */
    @Column(name = "site", nullable = false, length = 1)
    private String site;

    @Column(name = "site_code", nullable = false, length = 30)
    private String siteCode;

    @Column(name = "site_name", length = 300)
    private String siteName;
}
