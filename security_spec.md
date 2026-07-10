# Security Specification - Paroisse Lecteurs

## 1. Data Invariants
- A **Reader** must be associated with exactly one **Parish**.
- A **Mass** must belong to a **Parish**.
- **Attendance** and **Planning** must reference a valid **Reader** and **Mass** within the same **Parish**.
- Eligibility for assignment:
    - `trainingStatus == 'completed'`
    - Present at the rehearsal for the specific mass (if a rehearsal was held).
    - Status is 'present' (not 'late' or 'absent') for the arrival check.
- A **Planning** doc cannot have more than 4 assigned readers.

## 2. The Dirty Dozen Payloads (Rejection Targets)
1. **Identity Theft**: User A tries to create a reader record for Parish B while only being a member of Parish A.
2. **Shadow Field Injection**: User tries to add `isAdmin: true` to their reader profile.
3. **Array Bloating**: User tries to assign 50 readers to a single mass.
4. **ID Poisoning**: User tries to use a 10KB string as an ID for a mass.
5. **PII Leak**: An unauthenticated user tries to list all readers with their emails.
6. **Relational Mismatch**: Assigning a Reader from Parish A to a Mass in Parish B.
7. **Bypassing Training**: Assigning a reader with `trainingStatus: 'none'`.
8. **Orphaned Planning**: Creating a planning doc for a non-existent mass.
9. **Timestamp Spoofing**: Setting `createdAt` to a date in 1999 instead of `request.time`.
10. **Global Parish Access**: A parish admin trying to list masses of another parish.
11. **Action Bypass**: Directly updating the `assignedReaderIds` without going through the validation logic.
12. **Status Corruption**: Changing a 'completed' training status back to 'none' without permission.

## 3. Test Runner Concept
The `firestore.rules` will be evaluated against these constraints using the validation helpers and `affectedKeys()` patterns.
