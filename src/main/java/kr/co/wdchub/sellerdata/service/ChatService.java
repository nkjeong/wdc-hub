package kr.co.wdchub.sellerdata.service;

import kr.co.wdchub.sellerdata.domain.ChatMessage;
import kr.co.wdchub.sellerdata.domain.ChatRoom;
import kr.co.wdchub.sellerdata.domain.ChatSender;
import kr.co.wdchub.sellerdata.dto.ChatDtos.ConversationDto;
import kr.co.wdchub.sellerdata.dto.ChatDtos.MessageDto;
import kr.co.wdchub.sellerdata.dto.ChatDtos.RoomDto;
import kr.co.wdchub.sellerdata.repository.ChatMessageRepository;
import kr.co.wdchub.sellerdata.repository.ChatRoomRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;

/**
 * 회원 ↔ 관리자 1:1 문의 채팅.
 * - 회원 1명당 채팅방 1개. 회원이 첫 메시지를 보낼 때 만들어집니다.
 * - 새 메시지는 화면이 주기적으로 확인(폴링)해서 가져갑니다.
 * - 안 읽은 메시지가 "0개에서 1개가 되는 순간"에만 외부 알림(Chat/알림톡)을 보냅니다.
 *   대화가 이어지는 동안 메시지마다 알림톡이 나가서 요금과 스팸이 되는 걸 막기 위해서예요.
 */
@Service
@RequiredArgsConstructor
public class ChatService {

    private static final int MAX_LENGTH = 2000;
    private static final int FIRST_LOAD_SIZE = 50;
    private static final int POLL_MAX = 200;

    private final ChatRoomRepository roomRepository;
    private final ChatMessageRepository messageRepository;
    private final NotificationService notificationService;

    // ── 회원 쪽 ──────────────────────────────

    @Transactional
    public MessageDto sendFromMember(String username, String company, String phone, String content) {
        String text = validate(content);

        ChatRoom room = roomRepository.findByMemberUsername(username)
                .orElseGet(() -> roomRepository.save(ChatRoom.builder()
                        .memberUsername(username)
                        .memberUnread(0)
                        .adminUnread(0)
                        .build()));
        room.setCompanyName(company);
        room.setMemberPhone(phone);

        ChatMessage saved = messageRepository.save(ChatMessage.builder()
                .roomId(room.getId()).sender(ChatSender.MEMBER).content(text).build());

        boolean firstUnread = room.getAdminUnread() == 0;
        room.setAdminUnread(room.getAdminUnread() + 1);
        touch(room, text);

        if (firstUnread) {
            String who = (company == null || company.isBlank()) ? username : company;
            String preview = cut(text.replace('\n', ' '), 100);
            notificationService.alertAdmins(
                    "새 채팅 문의",
                    "회원: " + who + " (" + username + ")\n내용: " + preview,
                    "/dashboard",
                    "ADMIN_CHAT_NEW",
                    Map.of("회사명", who, "내용", cut(preview, 30)));
        }
        return toDto(saved);
    }

    /** 회원이 채팅창을 열었을 때/새 메시지를 확인할 때. 관리자 메시지를 읽음 처리합니다. */
    @Transactional
    public ConversationDto memberConversation(String username, long after) {
        ChatRoom room = roomRepository.findByMemberUsername(username).orElse(null);
        if (room == null) return new ConversationDto(null, null, List.of());
        if (room.getMemberUnread() > 0) room.setMemberUnread(0);
        return new ConversationDto(room.getId(), room.getCompanyName(), loadMessages(room.getId(), after));
    }

    @Transactional(readOnly = true)
    public long memberUnread(String username) {
        return roomRepository.findByMemberUsername(username).map(ChatRoom::getMemberUnread).orElse(0);
    }

    // ── 관리자 쪽 ────────────────────────────

    @Transactional(readOnly = true)
    public List<RoomDto> adminRooms() {
        return roomRepository.findAllByOrderByLastMessageAtDescIdDesc().stream()
                .filter(r -> r.getLastMessageAt() != null)
                .map(r -> new RoomDto(r.getId(),
                        r.getCompanyName() == null ? r.getMemberUsername() : r.getCompanyName(),
                        r.getMemberUsername(), r.getLastMessagePreview(), r.getLastMessageAt(), r.getAdminUnread()))
                .toList();
    }

    @Transactional(readOnly = true)
    public long adminUnreadTotal() {
        return roomRepository.sumAdminUnread();
    }

    /** 관리자가 대화를 열었을 때/새 메시지를 확인할 때. 회원 메시지를 읽음 처리합니다. */
    @Transactional
    public ConversationDto adminConversation(Long roomId, long after) {
        ChatRoom room = roomRepository.findById(roomId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 채팅방입니다."));
        if (room.getAdminUnread() > 0) room.setAdminUnread(0);
        String name = room.getCompanyName() == null ? room.getMemberUsername() : room.getCompanyName();
        return new ConversationDto(room.getId(), name, loadMessages(room.getId(), after));
    }

    @Transactional
    public MessageDto sendFromAdmin(Long roomId, String content) {
        String text = validate(content);
        ChatRoom room = roomRepository.findById(roomId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 채팅방입니다."));

        ChatMessage saved = messageRepository.save(ChatMessage.builder()
                .roomId(room.getId()).sender(ChatSender.ADMIN).content(text).build());

        boolean firstUnread = room.getMemberUnread() == 0;
        room.setMemberUnread(room.getMemberUnread() + 1);
        room.setAdminUnread(0); // 답장을 보냈다는 건 이미 읽었다는 뜻
        touch(room, text);

        if (firstUnread) {
            String who = room.getCompanyName() == null ? room.getMemberUsername() : room.getCompanyName();
            notificationService.alertMember(room.getMemberPhone(), "MEMBER_CHAT_REPLY", Map.of("회사명", who));
        }
        return toDto(saved);
    }

    // ── 내부 ─────────────────────────────────

    private List<MessageDto> loadMessages(Long roomId, long after) {
        List<ChatMessage> list;
        if (after <= 0) {
            list = new ArrayList<>(messageRepository.findByRoomIdOrderByIdDesc(roomId, PageRequest.of(0, FIRST_LOAD_SIZE)));
            Collections.reverse(list);
        } else {
            list = messageRepository.findByRoomIdAndIdGreaterThanOrderByIdAsc(roomId, after, PageRequest.of(0, POLL_MAX));
        }
        return list.stream().map(this::toDto).toList();
    }

    private void touch(ChatRoom room, String text) {
        room.setLastMessagePreview(cut(text.replace('\n', ' '), 100));
        room.setLastMessageAt(LocalDateTime.now());
    }

    private String validate(String content) {
        String text = content == null ? "" : content.trim();
        if (text.isEmpty()) throw new IllegalArgumentException("메시지를 입력해 주세요.");
        if (text.length() > MAX_LENGTH) throw new IllegalArgumentException("메시지는 " + MAX_LENGTH + "자 이내로 입력해 주세요.");
        return text;
    }

    private MessageDto toDto(ChatMessage m) {
        return new MessageDto(m.getId(), m.getSender().name(), m.getContent(), m.getCreatedAt());
    }

    private String cut(String s, int max) {
        return s.length() <= max ? s : s.substring(0, max);
    }
}
