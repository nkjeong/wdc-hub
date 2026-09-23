package kr.co.wdchub.sellerdata.controller;

import kr.co.wdchub.sellerdata.dto.OrderDtos.*;
import kr.co.wdchub.sellerdata.security.CustomUserDetails;
import kr.co.wdchub.sellerdata.service.OrderService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 회원용 주문(물류 대행). 사이드바의 "주문하기" 메뉴.
 * - GET  /orders                       : 화면 (주문하기 / 주문내역 탭)
 * - GET  /orders/list                  : 내 주문 목록(JSON, 상품 목록 포함)
 * - GET  /orders/{id}                  : 내 주문 상세(JSON)
 * - POST /orders                       : 주문 접수
 * - GET  /orders/product-search?keyword=  : 담을 상품 검색
 * - GET  /orders/products/{id}/options  : 그 상품의 옵션 목록
 */
@Controller
@RequestMapping("/orders")
public class OrderController {

    private final OrderService orderService;

    public OrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    @GetMapping
    public String page(@AuthenticationPrincipal CustomUserDetails user, Model model) {
        model.addAttribute("companyName", user.getMember().getCompanyName());
        model.addAttribute("defaultName", user.getMember().getName());
        model.addAttribute("defaultPhone", user.getMember().getPhoneNumber());
        return "order"; // templates/order.html
    }

    @GetMapping("/list")
    @ResponseBody
    public List<OrderDto> list(@AuthenticationPrincipal CustomUserDetails user) {
        return orderService.getMine(user.getMember().getId());
    }

    @GetMapping("/{id}")
    @ResponseBody
    public OrderDto detail(@PathVariable Long id, @AuthenticationPrincipal CustomUserDetails user) {
        return orderService.getMineDetail(user.getMember().getId(), id);
    }

    @PostMapping
    @ResponseBody
    public OrderDto create(@RequestBody OrderCreateRequest req, @AuthenticationPrincipal CustomUserDetails user) {
        return orderService.create(user.getMember().getId(), user.getUsername(), req);
    }

    @GetMapping("/product-search")
    @ResponseBody
    public List<ProductSearchResult> searchProducts(@RequestParam String keyword,
                                                     @AuthenticationPrincipal CustomUserDetails user) {
        return orderService.searchProducts(keyword, user.getMember().getId());
    }

    @GetMapping("/products/{id}/options")
    @ResponseBody
    public List<OptionResult> options(@PathVariable Long id) {
        return orderService.getOptions(id);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    @ResponseBody
    public ResponseEntity<String> handleIllegalArgument(IllegalArgumentException e) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
    }
}
