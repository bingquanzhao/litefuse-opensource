import { fireEvent, render, screen } from "@testing-library/react";
import { type ReactNode } from "react";
import { CommentDrawerButton } from "./CommentDrawerButton";

const mockOnOpenChange = jest.fn();

jest.mock("next/router", () => ({
  useRouter: () => ({
    query: {},
    asPath: "/",
    pathname: "/",
    replace: jest.fn(),
  }),
}));

jest.mock("../rbac/utils/checkProjectAccess", () => ({
  useHasProjectAccess: () => true,
}));

jest.mock("../../components/layouts/header", () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock("./CommentList", () => ({
  CommentList: () => <div>Comment list</div>,
}));

jest.mock("../../components/ui/button", () => ({
  Button: ({ children, ...props }: React.ComponentProps<"button">) => (
    <button {...props}>{children}</button>
  ),
}));

jest.mock("../../components/ui/drawer", () => ({
  Drawer: ({
    children,
    dismissible,
    onOpenChange,
  }: {
    children: ReactNode;
    dismissible?: boolean;
    onOpenChange?: (open: boolean) => void;
  }) => (
    <div data-testid="comments-drawer" data-dismissible={String(dismissible)}>
      <button type="button" onClick={() => onOpenChange?.(false)}>
        Dismiss drawer
      </button>
      {children}
    </div>
  ),
  DrawerContent: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DrawerClose: ({ children }: { children: ReactNode }) => <>{children}</>,
  DrawerHeader: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DrawerTitle: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DrawerTrigger: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

describe("CommentDrawerButton", () => {
  beforeEach(() => {
    mockOnOpenChange.mockReset();
  });

  it("allows the comments drawer to be dismissed", () => {
    render(
      <CommentDrawerButton
        projectId="project-1"
        objectId="trace-1"
        objectType="TRACE"
        isOpen
        onOpenChange={mockOnOpenChange}
      />,
    );

    expect(
      screen.getByTestId("comments-drawer").getAttribute("data-dismissible"),
    ).toBe("true");
    expect(screen.getByRole("button", { name: "Close comments" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Dismiss drawer" }));
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });
});
