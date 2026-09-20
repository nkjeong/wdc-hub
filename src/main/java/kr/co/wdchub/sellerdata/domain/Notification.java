package kr.co.wdchub.sellerdata.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * 상단 벨 아이콘에 보이는 앱 안 알림.
 * - audience=ADMIN  : 관리자 공용 알림 (recipientUsername 없음, 읽음 표시도 관리자 전체가 공유)
 * - audience=MEMBER : recipientUsername 회원 1명에게만 보이는 알림
 */
@Entity
@Table(name = "notification", indexes = {
        @Index(name = "idx_noti_audience", columnList = "audience, recipient_username, created_at")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(name = "audience", nullable = false, length = 10)
    private NotificationAudience audience;

    @Column(name = "recipient_username", length = 100)
    private String recipientUsername;

    /** 예: PRODUCT_REQUEST_NEW, PRODUCT_REQUEST_UPDATED, MEMBER_SIGNUP_NEW */
    @Column(name = "type", nullable = false, length = 40)
    private String type;

    @Column(name = "title", nullable = false, length = 200)
    private String title;

    @Column(name = "message", length = 500)
    private String message;

    /** 눌렀을 때 이동할 주소 (예: /admin/product-requests) */
    @Column(name = "link_url", length = 300)
    private String linkUrl;

    @Column(name = "read_yn", nullable = false)
    private boolean readYn;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
