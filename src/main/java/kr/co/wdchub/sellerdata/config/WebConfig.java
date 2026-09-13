package kr.co.wdchub.sellerdata.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

// 기본적으로 Spring Boot는 src/main/resources/static 폴더만 웹에서 바로 열어볼 수 있게 해줍니다.
// 우리가 업로드 파일을 저장하는 uploads 폴더는 그 바깥에 있어서, 아래처럼 별도로 등록해줘야
// 브라우저에서 /uploads/... 주소로 파일을 열어볼 수 있습니다.
@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        registry.addResourceHandler("/uploads/**")
                .addResourceLocations("file:uploads/");
    }
}
