package kr.co.wdchub.sellerdata.repository;

import kr.co.wdchub.sellerdata.domain.Member;
import kr.co.wdchub.sellerdata.domain.MemberStatus;
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

    long countByStatus(MemberStatus status);
}
