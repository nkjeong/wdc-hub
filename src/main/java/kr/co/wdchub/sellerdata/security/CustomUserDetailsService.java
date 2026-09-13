package kr.co.wdchub.sellerdata.security;

import kr.co.wdchub.sellerdata.domain.Member;
import kr.co.wdchub.sellerdata.repository.MemberRepository;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

// Spring Security가 로그인 처리 중 "이 아이디를 가진 회원이 있는지" 확인할 때 호출하는 클래스입니다.
@Service
public class CustomUserDetailsService implements UserDetailsService {

    private final MemberRepository memberRepository;

    public CustomUserDetailsService(MemberRepository memberRepository) {
        this.memberRepository = memberRepository;
    }

    @Override
    public UserDetails loadUserByUsername(String loginId) throws UsernameNotFoundException {
        Member member = memberRepository.findByLoginId(loginId)
                .orElseThrow(() -> new UsernameNotFoundException("존재하지 않는 아이디입니다: " + loginId));
        return new CustomUserDetails(member);
    }
}
