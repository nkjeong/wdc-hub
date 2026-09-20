package kr.co.wdchub.sellerdata.dto;

import java.time.LocalDateTime;
import java.util.List;

public class NotificationDtos {

    public record Item(
            Long id,
            String type,
            String title,
            String message,
            String linkUrl,
            boolean read,
            LocalDateTime createdAt
    ) {}

    public record ListResponse(long unreadCount, List<Item> items) {}
}
