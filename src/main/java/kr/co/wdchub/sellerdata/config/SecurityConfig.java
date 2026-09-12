package kr.co.wdchub.sellerdata.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
public class SecurityConfig {

    // ※ 임시 설정입니다.
    // 지금은 로그인 기능을 아직 안 만들었기 때문에, 일단 모든 요청을 허용해서
    // 디자인이 화면에 잘 뜨는지부터 확인하는 용도예요.
    // 나중에 실제 셀러 로그인을 붙일 때 이 클래스를 다시 손보게 됩니다.
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .authorizeHttpRequests(auth -> auth
                .anyRequest().permitAll()
            )
            .csrf(csrf -> csrf.disable());
        return http.build();
    }
}
