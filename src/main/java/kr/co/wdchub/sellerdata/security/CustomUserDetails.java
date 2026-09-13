package kr.co.wdchub.sellerdata.security;

import kr.co.wdchub.sellerdata.domain.Member;
import kr.co.wdchub.sellerdata.domain.MemberStatus;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;

// Member 엔티티를 Spring Security가 이해할 수 있는 형태로 감싸주는 클래스입니다.
public class CustomUserDetails implements UserDetails {

    private final Member member;

    public CustomUserDetails(Member member) {
        this.member = member;
    }

    // 화면(Controller)에서 로그인한 회원 정보를 꺼내 쓸 때 사용합니다.
    public Member getMember() {
        return member;
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        // Spring Security 권한은 관례상 "ROLE_" 접두사를 붙입니다. (예: ROLE_SELLER, ROLE_ADMIN)
        return List.of(new SimpleGrantedAuthority("ROLE_" + member.getRole().name()));
    }

    @Override
    public String getPassword() {
        return member.getPassword();
    }

    @Override
    public String getUsername() {
        return member.getLoginId();
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        // 이용 정지 상태면 계정이 잠긴 것으로 처리합니다.
        return member.getStatus() != MemberStatus.SUSPENDED;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        // 승인(APPROVED) 상태가 아니면(승인대기/거절) 로그인을 막습니다.
        return member.getStatus() == MemberStatus.APPROVED;
    }
}
