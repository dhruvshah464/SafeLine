"""
OpenClaw Agent Tools — Protected with @axonic_guardrail
"""
from .tools import read_client_data as _read
from .tools import execute_transfer as _transfer
from .tools import send_client_summary as _summary
from .decorator import axonic_guardrail


@axonic_guardrail
def execute_transfer(client_id, amount, destination, db_path="jpmc_mock.db"):
    return _transfer(client_id, amount, destination, db_path)


@axonic_guardrail
def send_client_summary(client_id, target_email, db_path="jpmc_mock.db"):
    return _summary(client_id, target_email, db_path)


def read_client_data(client_id, db_path="jpmc_mock.db"):
    return _read(client_id, db_path)
