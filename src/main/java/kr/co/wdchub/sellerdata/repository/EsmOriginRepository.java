package kr.co.wdchub.sellerdata.repository;

import kr.co.wdchub.sellerdata.domain.EsmOrigin;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface EsmOriginRepository extends JpaRepository<EsmOrigin, String> {

    /** 이름이 정확히 같은 원산지 (예: "프랑스" → 226) */
    Optional<EsmOrigin> findFirstByOriginName(String originName);

    /** 국내(DOMESTIC) 또는 해외(OVERSEAS) 목록 */
    List<EsmOrigin> findByAreaTypeOrderByOriginName(String areaType);

    /** 국내 도/시별 시/군/구 목록 (예: 강원) */
    List<EsmOrigin> findByAreaTypeAndProvinceOrderByCity(String areaType, String province);
}
