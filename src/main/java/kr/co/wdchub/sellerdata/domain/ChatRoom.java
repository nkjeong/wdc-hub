package kr.co.wdchub.sellerdata.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/** 회원 1명당 관리자와의 1:1 채팅방 1개 (첫 메시지를 보낼 때 만들어집니다) */
@Entity
@Table(name = "chat_room", uniqueConstraints = @UniqueConstraint(name = "uk_chat_room_member", columnNames = "member_username"))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChatRoom {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "member_username", nullable = false, length = 100)
    private String memberUsername;

    /** 관리자 화면 표시용 스냅샷 */
    @Column(name = "company_name", length = 200)
    private String companyName;

    /** 관리자 답변을 카카오톡 알림톡으로 알릴 때 쓰는 휴대폰 번호 (회원이 메시지를 보낼 때마다 갱신) */
    @Column(name = "member_phone", length = 30)
    private String memberPhone;

    @Column(name = "last_message_preview", length = 120)
    private String lastMessagePreview;

    @Column(name = "last_message_at")
    private LocalDateTime lastMessageAt;

    /** 회원이 아직 안 읽은 관리자 메시지 수 */
    @Column(name = "member_unread", nullable = false)
    private int memberUnread;

    /** 관리자가 아직 안 읽은 회원 메시지 수 */
    @Column(name = "admin_unread", nullable = false)
    private int adminUnread;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
