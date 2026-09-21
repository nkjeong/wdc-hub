package kr.co.wdchub.sellerdata.dto;

import java.util.List;

public class EsmDtos {

    /** 카테고리 한 단계의 항목. leaf=true면 더 내려갈 곳이 없는 "마지막 단계"이고 esmCode가 있습니다. */
    public record NodeDto(String name, boolean leaf, String esmCode) {}

    public record CategoryHit(String esmCode, String namePath) {}

    /** ESM 카테고리에 대응하는 G마켓 카테고리 (1개 또는 여러 개) */
    public record SiteOption(String siteCode, String siteName) {}

    public record CategoryDetail(String esmCode, String namePath, List<SiteOption> siteOptions) {}

    public record OriginDto(String code, String name, String regionType, String areaType) {}
}
