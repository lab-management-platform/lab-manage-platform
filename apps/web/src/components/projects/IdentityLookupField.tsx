import { useEffect, useMemo, useRef, useState } from "react";
import type { ManagedUser } from "../../types";

interface IdentityLookupValue {
  userId?: string;
  name: string;
  identityNo: string;
}

interface IdentityLookupFieldProps {
  label: string;
  placeholder: string;
  users: ManagedUser[];
  helper?: string;
  allowEmpty?: boolean;
  roles?: ManagedUser["role"][];
  value: IdentityLookupValue;
  onChange: (value: IdentityLookupValue) => void;
}

export function IdentityLookupField({
  label,
  placeholder,
  users,
  helper,
  allowEmpty = false,
  roles,
  value,
  onChange
}: IdentityLookupFieldProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLLabelElement | null>(null);
  const keyword = `${value.name} ${value.identityNo}`.trim().toLowerCase();
  const filteredUsers = useMemo(() => {
    const scopedUsers = roles?.length ? users.filter((user) => roles.includes(user.role)) : users;
    return scopedUsers
      .filter((user) =>
        keyword
          ? [user.displayName, user.identityNo, user.username].some((field) =>
              field.toLowerCase().includes(keyword)
            )
          : true
      )
      .slice(0, 8);
  }, [keyword, roles, users]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  return (
    <label className="identity-lookup" ref={rootRef}>
      <span>{label}</span>
      <div
        className="identity-lookup-shell"
        onBlurCapture={() => {
          window.setTimeout(() => {
            if (!rootRef.current?.contains(document.activeElement)) {
              setOpen(false);
            }
          }, 0);
        }}
      >
        <div className="identity-lookup-grid">
          <input
            placeholder={placeholder}
            value={value.name}
            onFocus={() => setOpen(true)}
            onChange={(event) =>
              onChange({
                userId: undefined,
                name: event.target.value,
                identityNo: value.identityNo
              })
            }
          />
          <input
            placeholder="输入学号/工号"
            value={value.identityNo}
            onFocus={() => setOpen(true)}
            onChange={(event) =>
              onChange({
                userId: undefined,
                name: value.name,
                identityNo: event.target.value
              })
            }
          />
        </div>
        {helper ? <small>{helper}</small> : null}
        {open ? (
          <div className="identity-suggestion-list">
            {allowEmpty ? (
              <button
                type="button"
                className="identity-suggestion ghost"
                onClick={() => {
                  onChange({ userId: undefined, name: "", identityNo: "" });
                  setOpen(false);
                }}
                onMouseDown={(event) => event.preventDefault()}
              >
                不指定
              </button>
            ) : null}
            {filteredUsers.length === 0 ? (
              <div className="identity-suggestion-empty">
                未匹配到成员，请继续输入姓名和学号/工号。
              </div>
            ) : (
              filteredUsers.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  className="identity-suggestion"
                  onClick={() => {
                    onChange({
                      userId: user.id,
                      name: user.displayName,
                      identityNo: user.identityNo
                    });
                    setOpen(false);
                  }}
                  onMouseDown={(event) => event.preventDefault()}
                >
                  <strong>{user.displayName}</strong>
                  <small>
                    {user.identityNo} · {user.username}
                  </small>
                </button>
              ))
            )}
          </div>
        ) : null}
      </div>
    </label>
  );
}
