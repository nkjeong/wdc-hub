package kr.co.wdchub.sellerdata.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
public class SecurityConfig {

    // 회원가입 시 비밀번호를 암호화해서 저장하고, 로그인 시 입력값과 비교할 때 사용합니다.
    // CustomUserDetailsService가 돌려주는 회원 정보와 이 PasswordEncoder를 Spring Security가
    // 자동으로 엮어서 로그인 인증을 처리합니다. (따로 연결 코드를 안 적어도 됩니다)
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .authorizeHttpRequests(auth -> auth
                // 로그인 화면 자체와, 화면을 꾸미는 css/js 파일은 로그인 없이도 접근 가능해야 합니다.
                .requestMatchers("/login", "/signup", "/signup/**", "/css/**", "/js/**").permitAll()
                .requestMatchers("/admin/**").hasRole("ADMIN")
                // 그 외 모든 요청(대시보드 포함)은 로그인이 필요합니다.
                .anyRequest().authenticated()
            )
            .formLogin(form -> form
                .loginPage("/login")              // 로그인이 필요할 때 보여줄 화면
                .loginProcessingUrl("/login")      // login.html의 <form th:action="@{/login}">이 제출되는 주소
                .defaultSuccessUrl("/dashboard", true) // 로그인 성공하면 이동할 위치
                .permitAll()
            )
            .logout(logout -> logout
                .logoutSuccessUrl("/login?logout")
                .permitAll()
            )
            // ※ 아직 임시로 꺼둔 상태입니다. 나중에 실제 서비스로 갈 때 다시 켜야 해요.
            .csrf(csrf -> csrf.disable());
        return http.build();
    }
}
