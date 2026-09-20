package kr.co.wdchub.sellerdata.config;

import kr.co.wdchub.sellerdata.service.BannerService;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * 서버에 저장된 배너 이미지(uploads/banners)를 /uploads/banners/** 주소로 내려줍니다.
 * (이미 /uploads/** 를 서빙하는 설정이 있어도 충돌 없이 함께 동작합니다.)
 */
@Configuration
public class BannerWebConfig implements WebMvcConfigurer {

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        String location = BannerService.BANNER_DIR.toAbsolutePath().toUri().toString(); // file:/.../uploads/banners
        // 폴더가 아직 없으면 toUri()가 끝에 /를 붙여주지 않아서, 직접 붙입니다 (없으면 이미지가 404가 돼요)
        if (!location.endsWith("/")) location += "/";
        registry.addResourceHandler("/uploads/banners/**")
                .addResourceLocations(location);
    }
}
