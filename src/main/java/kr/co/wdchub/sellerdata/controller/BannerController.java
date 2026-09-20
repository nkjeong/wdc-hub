package kr.co.wdchub.sellerdata.controller;

import kr.co.wdchub.sellerdata.service.BannerService;
import kr.co.wdchub.sellerdata.service.BannerService.BannerResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/**
 * 회원 대시보드용 배너 조회 API.
 * 응답 예: { "super-flow": [ {"imageUrl":"/uploads/banners/a.jpg", ...} ], "swiper-gl": [ ... ] }
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/banners")
public class BannerController {

    private final BannerService bannerService;

    @GetMapping
    public Map<String, List<BannerResponse>> list() {
        return bannerService.listAll();
    }
}
