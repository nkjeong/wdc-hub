package kr.co.wdchub.sellerdata.service;

import kr.co.wdchub.sellerdata.domain.*;
import kr.co.wdchub.sellerdata.dto.OrderDtos.*;
import kr.co.wdchub.sellerdata.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

/**
 * 물류 대행 주문. 회원이 상품을 담아 접수하면, 관리자가 주문확인 → 상품준비중 → 발송완료 순서로 처리합니다.
 *
 * 등급별 단가: Member.grade(NORMAL/GOLD/VIP)에 따라 Product의 sellerPrice1/2/3 중 하나를 씁니다.
 *   NORMAL → sellerPrice1, GOLD → sellerPrice2, VIP → sellerPrice3
 * 이 매칭은 프로젝트의 다른 화면(공급가 표시)과 같은 규칙이어야 합니다. 등급 구성이 다르면 priceFor() 안의
 * switch문만 고치면 됩니다.
 */
@Service
@RequiredArgsConstructor
public class OrderService {

    private static final int SEARCH_LIMIT = 30;
    private static final int MAX_QUANTITY = 999;
    private static final DateTimeFormatter CODE_DATE = DateTimeFormatter.ofPattern("yyyyMMdd");

    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final ProductRepository productRepository;
    private final ProductOptionRepository productOptionRepository;
    private final MemberRepository memberRepository;
    private final OrderExportLogRepository orderExportLogRepository;
    private final NotificationService notificationService;

    // ── 상품 검색 / 옵션 조회 (주문하기 화면) ──────

    @Transactional(readOnly = true)
    public List<ProductSearchResult> searchProducts(String keyword, Long memberId) {
        String k = keyword == null ? "" : keyword.trim();
        if (k.length() < 1) return List.of();
        Member member = findMember(memberId);

        return productRepository.findAll().stream()
                .filter(p -> !Boolean.TRUE.equals(p.getDiscontinuedYn()))
                .filter(p -> matches(p, k))
                .limit(SEARCH_LIMIT)
                .map(p -> new ProductSearchResult(
                        p.getId(), p.getProductName(), p.getBarcode(), p.getMainImageThumbUrl(),
                        p.getUnit(), p.getUnitQuantity(), priceFor(p, member), p.getHasOptionYn()))
                .toList();
    }

    private boolean matches(Product p, String k) {
        String kl = k.toLowerCase();
        return (p.getProductName() != null && p.getProductName().toLowerCase().contains(kl))
                || (p.getBarcode() != null && p.getBarcode().toLowerCase().contains(kl))
                || (p.getProductNumber() != null && p.getProductNumber().toLowerCase().contains(kl));
    }

    @Transactional(readOnly = true)
    public List<OptionResult> getOptions(Long productId) {
        return productOptionRepository.findAllByProduct_IdOrderBySortOrderAsc(productId).stream()
                .map(o -> new OptionResult(o.getId(), o.getOptionName(), o.getOptionValue(),
                        o.getAdditionalPrice(), o.getStockQuantity(), o.getSoldOutYn()))
                .toList();
    }

    // ── 회원: 주문 접수 ────────────────────────

    @Transactional
    public OrderDto create(Long memberId, String username, OrderCreateRequest req) {
        Member member = findMember(memberId);

        String name = blank(req.requesterName()) ? member.getName() : req.requesterName().trim();
        String phone = blank(req.requesterPhone()) ? member.getPhoneNumber() : req.requesterPhone().trim();
        String address = req.address() == null ? "" : req.address().trim();
        if (name == null || name.isBlank()) throw new IllegalArgumentException("받는 분 이름을 입력해 주세요.");
        if (phone == null || phone.isBlank()) throw new IllegalArgumentException("받는 분 연락처를 입력해 주세요.");
        if (address.isBlank()) throw new IllegalArgumentException("배송 주소를 입력해 주세요.");
        if (req.items() == null || req.items().isEmpty()) throw new IllegalArgumentException("담은 상품이 없어요.");
        if (req.items().size() > 100) throw new IllegalArgumentException("한 번에 담을 수 있는 상품은 100줄까지예요.");

        List<OrderItem> items = new ArrayList<>();
        BigDecimal total = BigDecimal.ZERO;
        for (OrderItemRequest line : req.items()) {
            if (line.quantity() == null || line.quantity() < 1 || line.quantity() > MAX_QUANTITY) {
                throw new IllegalArgumentException("수량은 1~" + MAX_QUANTITY + "개 사이로 입력해 주세요.");
            }
            Product p = productRepository.findById(line.productId())
                    .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 상품이 포함되어 있어요."));
            if (Boolean.TRUE.equals(p.getDiscontinuedYn())) {
                throw new IllegalArgumentException("단종된 상품이 포함되어 있어요: " + p.getProductName());
            }

            String optionName = null;
            BigDecimal unitPrice = priceFor(p, member);
            String barcode = p.getBarcode();

            if (line.optionId() != null) {
                ProductOption opt = productOptionRepository.findById(line.optionId())
                        .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 옵션이 포함되어 있어요."));
                if (opt.getProduct() == null || !Objects.equals(opt.getProduct().getId(), p.getId())) {
                    throw new IllegalArgumentException("상품과 옵션이 서로 맞지 않아요.");
                }
                if (Boolean.TRUE.equals(opt.getSoldOutYn())) {
                    throw new IllegalArgumentException("품절된 옵션이 포함되어 있어요: " + p.getProductName() + " (" + opt.getOptionValue() + ")");
                }
                optionName = (opt.getOptionName() != null ? opt.getOptionName() + ": " : "") + opt.getOptionValue();
                if (opt.getAdditionalPrice() != null) unitPrice = unitPrice.add(opt.getAdditionalPrice());
                if (opt.getOptionBarcode() != null && !opt.getOptionBarcode().isBlank()) barcode = opt.getOptionBarcode();
            } else if (Boolean.TRUE.equals(p.getHasOptionYn())) {
                throw new IllegalArgumentException("옵션을 선택해 주세요: " + p.getProductName());
            }

            BigDecimal lineTotal = unitPrice.multiply(BigDecimal.valueOf(line.quantity()));
            total = total.add(lineTotal);
            items.add(OrderItem.builder()
                    .productId(p.getId()).productName(p.getProductName()).barcode(barcode)
                    .optionName(optionName).unitPrice(unitPrice).quantity(line.quantity()).lineTotal(lineTotal)
                    .build());
        }

        Order order = Order.builder()
                .orderCode(nextOrderCode())
                .memberId(memberId)
                .requesterName(name)
                .requesterPhone(phone)
                .zonecode(blank(req.zonecode()) ? null : req.zonecode().trim())
                .address(address)
                .addressDetail(blank(req.addressDetail()) ? null : req.addressDetail().trim())
                .deliveryMessage(blank(req.deliveryMessage()) ? null : cut(req.deliveryMessage().trim(), 200))
                .status(OrderStatus.RECEIVED)
                .totalAmount(total)
                .build();
        order = orderRepository.save(order);
        for (OrderItem it : items) it.setOrderId(order.getId());
        orderItemRepository.saveAll(items);

        String who = (member.getCompanyName() == null || member.getCompanyName().isBlank()) ? username : member.getCompanyName();
        notificationService.notifyAdmins("ORDER_NEW", "새 주문 접수",
                who + " · " + order.getOrderCode() + " · " + items.size() + "종",
                "/admin/orders", "회원: " + who + " (" + username + ")\n주문번호: " + order.getOrderCode()
                        + "\n상품: " + items.size() + "종 " + items.stream().mapToInt(OrderItem::getQuantity).sum() + "개",
                "ADMIN_ORDER_NEW", Map.of("회사명", who, "주문번호", order.getOrderCode()));

        return toDto(order, items, null, null);
    }

    private String nextOrderCode() {
        LocalDateTime startOfDay = LocalDate.now().atStartOfDay();
        long seq = orderRepository.countByCreatedAtAfter(startOfDay) + 1;
        return "ORD-" + LocalDate.now().format(CODE_DATE) + "-" + String.format("%04d", seq);
    }

    private BigDecimal priceFor(Product p, Member member) {
        MemberGrade grade = member.getGrade();
        BigDecimal price = switch (grade == null ? MemberGrade.NORMAL : grade) {
            case GOLD -> p.getSellerPrice2();
            case VIP -> p.getSellerPrice3();
            default -> p.getSellerPrice1();
        };
        return price == null ? BigDecimal.ZERO : price;
    }

    // ── 회원: 내 주문 조회 ─────────────────────

    @Transactional(readOnly = true)
    public List<OrderDto> getMine(Long memberId) {
        List<Order> orders = orderRepository.findAllByMemberIdOrderByCreatedAtDesc(memberId);
        return toDtos(orders, false);
    }

    @Transactional(readOnly = true)
    public OrderDto getMineDetail(Long memberId, Long orderId) {
        Order order = orderRepository.findByIdAndMemberId(orderId, memberId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 주문이에요."));
        return toDto(order, orderItemRepository.findByOrderIdOrderById(order.getId()), null, null);
    }

    // ── 관리자: 조회 / 상태 변경 ───────────────

    @Transactional(readOnly = true)
    public List<OrderDto> getAllForAdmin(OrderStatus status) {
        List<Order> orders = status == null
                ? orderRepository.findAllByOrderByCreatedAtDesc()
                : orderRepository.findAllByStatusOrderByCreatedAtDesc(status);
        return toDtos(orders, true);
    }

    @Transactional
    public OrderDto updateStatus(Long orderId, StatusUpdateRequest req) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 주문이에요."));
        OrderStatus newStatus;
        try {
            newStatus = OrderStatus.valueOf(req.status());
        } catch (Exception e) {
            throw new IllegalArgumentException("처리 상태 값이 올바르지 않아요.");
        }
        if (newStatus == OrderStatus.SHIPPED) {
            if (blank(req.trackingNumber())) throw new IllegalArgumentException("발송완료로 바꾸려면 송장번호를 입력해 주세요.");
        }

        OrderStatus old = order.getStatus();
        order.setStatus(newStatus);
        order.setCarrier(blank(req.carrier()) ? null : req.carrier().trim());
        order.setTrackingNumber(blank(req.trackingNumber()) ? null : req.trackingNumber().trim());
        order.setAdminMemo(blank(req.adminMemo()) ? null : cut(req.adminMemo().trim(), 500));
        LocalDateTime now = LocalDateTime.now();
        if (newStatus == OrderStatus.CONFIRMED && order.getConfirmedAt() == null) order.setConfirmedAt(now);
        if (newStatus == OrderStatus.SHIPPED && order.getShippedAt() == null) order.setShippedAt(now);
        if (newStatus == OrderStatus.CANCELED && order.getCanceledAt() == null) order.setCanceledAt(now);

        if (old != newStatus) {
            Member member = memberRepository.findById(order.getMemberId()).orElse(null);
            String msg = order.getOrderCode() + " · " + newStatus.getLabel()
                    + (newStatus == OrderStatus.SHIPPED ? " (" + nz(order.getCarrier()) + " " + order.getTrackingNumber() + ")" : "");
            notificationService.notifyMember(member != null ? member.getLoginId() : null,
                    "ORDER_STATUS", "주문 상태가 바뀌었어요", msg, "/orders");
            if (member != null) {
                notificationService.alertMember(member.getPhoneNumber(), "MEMBER_ORDER_STATUS",
                        Map.of("주문번호", order.getOrderCode(), "상태", newStatus.getLabel()));
            }
        }
        return toDto(order, orderItemRepository.findByOrderIdOrderById(order.getId()), null, null);
    }

    // ── 관리자: "주문접수" 탭 엑셀 다운로드 → 자동 주문확인 처리 ──

    /** 이 중에 예전에 이미 다운로드했던 주문이 있으면 그 주문번호들을 돌려줍니다. (없으면 빈 목록) */
    @Transactional(readOnly = true)
    public List<String> findAlreadyDownloadedCodes(List<Long> orderIds) {
        if (orderIds == null || orderIds.isEmpty()) return List.of();
        return orderRepository.findAllById(orderIds).stream()
                .filter(o -> o.getDownloadedAt() != null)
                .map(Order::getOrderCode)
                .toList();
    }

    /**
     * 엑셀로 내려받는 시점에 호출합니다. 다운로드 시각을 남기고, 아직 "주문접수" 상태인 주문은
     * "주문확인"으로 자동 전환합니다. 이미 다른 단계로 넘어간 주문(주문확인 이후)은 상태를 건드리지 않고
     * 다운로드 시각만 갱신합니다. 다운로드 기록 한 줄도 함께 남깁니다.
     */
    @Transactional
    public List<OrderDto> exportAndConfirm(List<Long> orderIds, String adminUsername) {
        if (orderIds == null || orderIds.isEmpty()) throw new IllegalArgumentException("다운로드할 주문이 없어요.");
        List<Order> orders = orderRepository.findAllById(orderIds);
        if (orders.isEmpty()) throw new IllegalArgumentException("존재하지 않는 주문이에요.");

        LocalDateTime now = LocalDateTime.now();
        List<String> codes = new ArrayList<>();
        for (Order o : orders) {
            o.setDownloadedAt(now);
            if (o.getStatus() == OrderStatus.RECEIVED) {
                o.setStatus(OrderStatus.CONFIRMED);
                if (o.getConfirmedAt() == null) o.setConfirmedAt(now);
            }
            codes.add(o.getOrderCode());
        }

        orderExportLogRepository.save(OrderExportLog.builder()
                .adminUsername(adminUsername)
                .orderCount(orders.size())
                .orderCodes(String.join(", ", codes))
                .build());

        return toDtos(orders, true);
    }

    @Transactional(readOnly = true)
    public List<ExportLogDto> getExportLog() {
        return orderExportLogRepository.findTop20ByOrderByExportedAtDesc().stream()
                .map(l -> new ExportLogDto(l.getId(), l.getExportedAt(), l.getAdminUsername(), l.getOrderCount(), l.getOrderCodes()))
                .toList();
    }

    // ── 내부 ───────────────────────────────────

    private Member findMember(Long memberId) {
        return memberRepository.findById(memberId)
                .orElseThrow(() -> new IllegalArgumentException("회원 정보를 찾을 수 없어요."));
    }

    private List<OrderDto> toDtos(List<Order> orders, boolean withMemberInfo) {
        if (orders.isEmpty()) return List.of();
        List<Long> ids = orders.stream().map(Order::getId).toList();
        Map<Long, List<OrderItem>> itemsByOrder = orderItemRepository.findByOrderIdInOrderById(ids).stream()
                .collect(Collectors.groupingBy(OrderItem::getOrderId));

        Map<Long, Member> membersById = withMemberInfo
                ? memberRepository.findAllById(orders.stream().map(Order::getMemberId).distinct().toList()).stream()
                        .collect(Collectors.toMap(Member::getId, m -> m))
                : Map.of();

        return orders.stream().map(o -> {
            Member m = membersById.get(o.getMemberId());
            return toDto(o, itemsByOrder.getOrDefault(o.getId(), List.of()),
                    m != null ? m.getLoginId() : null, m != null ? m.getCompanyName() : null);
        }).toList();
    }

    private OrderDto toDto(Order o, List<OrderItem> items, String username, String companyName) {
        List<OrderItemDto> itemDtos = items.stream()
                .map(i -> new OrderItemDto(i.getId(), i.getProductId(), i.getProductName(), i.getBarcode(),
                        i.getOptionName(), i.getUnitPrice(), i.getQuantity(), i.getLineTotal()))
                .toList();
        return new OrderDto(
                o.getId(), o.getOrderCode(), o.getStatus().name(), o.getStatus().getLabel(),
                o.getRequesterName(), o.getRequesterPhone(), o.getZonecode(), o.getAddress(), o.getAddressDetail(),
                o.getDeliveryMessage(), o.getCarrier(), o.getTrackingNumber(), o.getAdminMemo(),
                username, companyName, o.getTotalAmount(), o.getCreatedAt(), o.getConfirmedAt(), o.getShippedAt(),
                itemDtos);
    }

    private boolean blank(String s) { return s == null || s.isBlank(); }
    private String nz(String s) { return s == null ? "" : s; }
    private String cut(String s, int max) { return s.length() <= max ? s : s.substring(0, max); }
}
