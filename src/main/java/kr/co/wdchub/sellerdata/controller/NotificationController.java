package kr.co.wdchub.sellerdata.controller;

import kr.co.wdchub.sellerdata.dto.NotificationDtos.ListResponse;
import kr.co.wdchub.sellerdata.security.CustomUserDetails;
import kr.co.wdchub.sellerdata.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/**
 * 상단 벨 아이콘 알림 API (로그인한 관리자/회원 모두 사용).
 * - GET  /notifications           : 최근 알림 20개 + 안 읽은 개수
 * - POST /notifications/{id}/read : 알림 1개 읽음 처리
 * - POST /notifications/read-all  : 모두 읽음 처리
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/notifications")
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping
    public ListResponse list(@AuthenticationPrincipal CustomUserDetails user) {
        return notificationService.list(user.getUsername(), isAdmin(user));
    }

    @PostMapping("/{id}/read")
    public void read(@PathVariable Long id, @AuthenticationPrincipal CustomUserDetails user) {
        notificationService.markRead(id, user.getUsername(), isAdmin(user));
    }

    @PostMapping("/read-all")
    public void readAll(@AuthenticationPrincipal CustomUserDetails user) {
        notificationService.markAllRead(user.getUsername(), isAdmin(user));
    }

    private boolean isAdmin(CustomUserDetails user) {
        return user.getAuthorities().stream().anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()));
    }
}
