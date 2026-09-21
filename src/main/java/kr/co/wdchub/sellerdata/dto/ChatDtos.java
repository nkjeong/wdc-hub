package kr.co.wdchub.sellerdata.dto;

import java.time.LocalDateTime;
import java.util.List;

public class ChatDtos {

    public record SendRequest(String content) {}

    /** sender: "MEMBER" 또는 "ADMIN" */
    public record MessageDto(Long id, String sender, String content, LocalDateTime createdAt) {}

    public record ConversationDto(Long roomId, String companyName, List<MessageDto> messages) {}

    public record RoomDto(Long id, String companyName, String username, String lastMessage,
                          LocalDateTime lastMessageAt, int unread) {}

    /** admin: 관리자 여부, unread: 안 읽은 메시지 수 (관리자는 전체 합계) */
    public record SummaryDto(boolean admin, long unread) {}
}
