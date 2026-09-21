package kr.co.wdchub.sellerdata.controller;

import kr.co.wdchub.sellerdata.dto.ChatDtos.ConversationDto;
import kr.co.wdchub.sellerdata.dto.ChatDtos.MessageDto;
import kr.co.wdchub.sellerdata.dto.ChatDtos.RoomDto;
import kr.co.wdchub.sellerdata.dto.ChatDtos.SendRequest;
import kr.co.wdchub.sellerdata.service.ChatService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** 관리자용 채팅 API — 회원별 채팅방 목록과 답변 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/admin/chat")
@PreAuthorize("hasRole('ADMIN')")
public class AdminChatController {

    private final ChatService chatService;

    @GetMapping("/rooms")
    public List<RoomDto> rooms() {
        return chatService.adminRooms();
    }

    @GetMapping("/rooms/{roomId}/messages")
    public ConversationDto messages(@PathVariable Long roomId, @RequestParam(defaultValue = "0") long after) {
        return chatService.adminConversation(roomId, after);
    }

    @PostMapping("/rooms/{roomId}/messages")
    public MessageDto send(@PathVariable Long roomId, @RequestBody SendRequest req) {
        return chatService.sendFromAdmin(roomId, req.content());
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<String> handleIllegalArgument(IllegalArgumentException e) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
    }
}
