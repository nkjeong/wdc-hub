package kr.co.wdchub.sellerdata.controller;

import kr.co.wdchub.sellerdata.dto.ChatDtos.ConversationDto;
import kr.co.wdchub.sellerdata.dto.ChatDtos.MessageDto;
import kr.co.wdchub.sellerdata.dto.ChatDtos.SendRequest;
import kr.co.wdchub.sellerdata.dto.ChatDtos.SummaryDto;
import kr.co.wdchub.sellerdata.security.CustomUserDetails;
import kr.co.wdchub.sellerdata.service.ChatService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/**
 * 회원용 채팅 API (관리자와의 1:1 문의 채팅).
 * - GET  /chat/summary          : 내가 관리자인지 + 안 읽은 메시지 수 (채팅 아이콘 배지용, 관리자도 이 주소를 씁니다)
 * - GET  /chat/messages?after=  : 내 대화 (after=마지막으로 받은 메시지 id, 0이면 최근 50개). 관리자 메시지를 읽음 처리합니다.
 * - POST /chat/messages         : 관리자에게 메시지 보내기
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/chat")
public class ChatController {

    private final ChatService chatService;

    @GetMapping("/summary")
    public SummaryDto summary(@AuthenticationPrincipal CustomUserDetails user) {
        boolean admin = isAdmin(user);
        long unread = admin ? chatService.adminUnreadTotal() : chatService.memberUnread(user.getUsername());
        return new SummaryDto(admin, unread);
    }

    @GetMapping("/messages")
    public ConversationDto messages(@RequestParam(defaultValue = "0") long after,
                                    @AuthenticationPrincipal CustomUserDetails user) {
        return chatService.memberConversation(user.getUsername(), after);
    }

    @PostMapping("/messages")
    public MessageDto send(@RequestBody SendRequest req, @AuthenticationPrincipal CustomUserDetails user) {
        return chatService.sendFromMember(
                user.getUsername(), user.getMember().getCompanyName(), user.getMember().getPhoneNumber(), req.content());
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<String> handleIllegalArgument(IllegalArgumentException e) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
    }

    private boolean isAdmin(CustomUserDetails user) {
        return user.getAuthorities().stream().anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()));
    }
}
