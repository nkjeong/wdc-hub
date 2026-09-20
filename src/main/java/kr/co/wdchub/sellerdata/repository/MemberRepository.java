package kr.co.wdchub.sellerdata.repository;

import kr.co.wdchub.sellerdata.domain.Member;
import kr.co.wdchub.sellerdata.domain.MemberStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface MemberRepository extends JpaRepository<Member, Long> {

    // 로그인 시 아이디로 회원을 찾을 때 사용
    Optional<Member> findByLoginId(String loginId);

    // 회원가입 시 중복 체크용
    boolean existsByLoginId(String loginId);

    boolean existsByEmail(String email);

    boolean existsByBusinessRegistrationNumber(String businessRegistrationNumber);

    // 관리자 회원관리 화면용
    List<Member> findAllByOrderByCreatedAtDesc();

    // 관리자 회원관리 화면 페이지네이션용 (위 메서드와 같은 정렬 조건을 Pageable로 잘라서 가져옵니다)
    Page<Member> findAllByOrderByCreatedAtDesc(Pageable pageable);

    long countByStatus(MemberStatus status);
}
